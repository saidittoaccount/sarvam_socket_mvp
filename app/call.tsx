"use client";

import { useEffect, useRef, useState } from "react";
import {
  AuthenticationError,
  BrowserAudioInterface,
  ConversationAgent,
  ForbiddenError,
  InteractionType,
  NotFoundError,
  RateLimitError,
} from "sarvam-conv-ai-sdk/browser";

type Line = { role: "user" | "bot"; text: string };
type Props = { orgId: string; workspaceId: string; appId: string; version?: number };
type Phase = "idle" | "connecting" | "live";

const STATE_LABEL: Record<string, string> = {
  connecting: "Connecting",
  connected: "Connected",
  listening: "Listening",
  speaking: "Meena is speaking",
};

function friendly(e: unknown) {
  if (e instanceof RateLimitError) return `Too many calls right now. Retry in ${e.retryAfter}s.`;
  if (e instanceof AuthenticationError || e instanceof ForbiddenError)
    return "The server key was rejected.";
  if (e instanceof NotFoundError) return "Agent not found for this workspace.";
  if (e instanceof Error) {
    if (e.name === "NotAllowedError") return "Microphone permission was denied.";
    if (e.name === "NotFoundError") return "No microphone found.";
    if (e.name === "NotReadableError") return "The microphone is in use by another app.";
    return e.message;
  }
  return String(e);
}

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Call({ orgId, workspaceId, appId, version }: Props) {
  const agentRef = useRef<ConversationAgent | null>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [agentState, setAgentState] = useState("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [interactionId, setInteractionId] = useState("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);
  useEffect(() => {
    return () => {
      agentRef.current?.stop().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Must run from a click so the browser allows mic access and audio playback.
  async function start() {
    setError("");
    setLines([]);
    setSeconds(0);
    setPhase("connecting");
    try {
      const agent = new ConversationAgent({
        apiKey: "", // key stays on the server; the SDK fetches the signed URL via our proxy
        baseUrl: "/api/sarvam/",
        audioInterface: new BrowserAudioInterface(),
        config: {
          org_id: orgId,
          workspace_id: workspaceId,
          app_id: appId,
          version,
          user_identifier: `trainee-${Date.now()}`,
          user_identifier_type: "custom",
          interaction_type: InteractionType.CALL,
          input_sample_rate: 16000,
          output_sample_rate: 16000,
        },
        transcriptCallback: async (m) =>
          setLines((l) => [...l, { role: m.role === "user" ? "user" : "bot", text: m.content }]),
        stateCallback: (s) => setAgentState(String(s)),
        audioLevelCallback: (lvl) => {
          // Drive the orb straight from the DOM; React renders would be too slow.
          const el = orbRef.current;
          if (!el) return;
          const key = lvl.direction === "output" ? "--out" : "--in";
          el.style.setProperty(key, Math.min(1, lvl.rms * 3).toFixed(3));
        },
        endCallback: async () => {
          setPhase("idle");
          setMuted(false);
          setAgentState("idle");
        },
      });
      agentRef.current = agent;
      await agent.start();
      if (!(await agent.waitForConnect(15))) throw new Error("Timed out connecting to the agent.");
      setInteractionId(agent.getInteractionId() ?? "");
      setPhase("live");
    } catch (e) {
      setError(friendly(e));
      await agentRef.current?.stop().catch(() => {});
      setPhase("idle");
    }
  }

  async function hangUp() {
    await agentRef.current?.stop().catch(() => {});
    setPhase("idle");
    setMuted(false);
  }

  function toggleMute() {
    const a = agentRef.current;
    if (!a) return;
    if (a.isMuted()) a.unmute();
    else a.mute();
    setMuted(a.isMuted());
  }

  const live = phase === "live";
  const label =
    phase === "connecting"
      ? "Connecting"
      : live
        ? (STATE_LABEL[agentState] ?? agentState)
        : "Ready when you are";

  return (
    <main className="call">
      <section className="stage">
        <div ref={orbRef} className={`orb ${live ? agentState : ""} ${phase}`}>
          <div className="ring r1" />
          <div className="ring r2" />
          <div className="core" />
        </div>
        <div className="state">{label}</div>
        <div className="timer">{live ? fmt(seconds) : "00:00"}</div>
        {interactionId && live && <div className="muted small mono">{interactionId}</div>}
        {error && <div className="err">{error}</div>}
        <div className="controls">
          {live ? (
            <>
              <button className={`btn ${muted ? "warn" : ""}`} onClick={toggleMute}>
                {muted ? "Unmute" : "Mute"}
              </button>
              <button className="btn danger" onClick={hangUp}>
                End call
              </button>
            </>
          ) : (
            <button className="btn primary big" onClick={start} disabled={phase === "connecting"}>
              {phase === "connecting" ? "Connecting…" : "Start call"}
            </button>
          )}
        </div>
        {!live && (
          <p className="muted small hint">
            Your browser will ask for the microphone. A dropped call can't resume; just start a new
            one.
          </p>
        )}
      </section>

      <section className="transcript card">
        <div className="card-head">Live transcript</div>
        <div className="scroll">
          {lines.length === 0 && <div className="empty">The conversation will appear here.</div>}
          {lines.map((l, i) => (
            <div key={i} className={`msg ${l.role}`}>
              <div className="who">{l.role === "user" ? "You" : "Meena"}</div>
              <div className="bubble">{l.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </section>
    </main>
  );
}
