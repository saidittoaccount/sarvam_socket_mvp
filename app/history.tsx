"use client";

import { useEffect, useState } from "react";

type Item = {
  interaction_id: string;
  start_datetime: string;
  duration_in_seconds: number;
  num_messages: number;
  ended_by: string;
  app_version: number;
  has_audio: boolean;
};
type Msg = { turn_id: number; role: string; content: string };

const dur = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
const when = (iso: string) =>
  new Date(iso.endsWith("Z") || /[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z").toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function History({ active }: { active: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);

  async function load() {
    setError("");
    const r = await fetch("/api/calls");
    if (!r.ok) return setError(`Could not load calls (${r.status}).`);
    setItems((await r.json()).items);
  }

  useEffect(() => {
    if (active) void load();
  }, [active]);

  async function open(item: Item) {
    setSelected(item);
    setMsgs(null);
    const r = await fetch(
      `/api/calls/transcript?id=${encodeURIComponent(item.interaction_id).replace("%2F", "/")}`,
    );
    setMsgs(r.ok ? ((await r.json()).messages ?? []) : []);
  }

  return (
    <main className="history">
      <section className="card list">
        <div className="card-head">
          Last 30 days
          <button className="link" onClick={load}>
            Refresh
          </button>
        </div>
        <div className="scroll">
          {error && <div className="err pad">{error}</div>}
          {!items && !error && <div className="empty">Loading…</div>}
          {items?.length === 0 && <div className="empty">No calls yet.</div>}
          {items?.map((i) => (
            <button
              key={i.interaction_id}
              className={`row ${selected?.interaction_id === i.interaction_id ? "on" : ""}`}
              onClick={() => open(i)}
            >
              <div>
                <div>{when(i.start_datetime)}</div>
                <div className="muted small">
                  {i.num_messages} messages · v{i.app_version}
                </div>
              </div>
              <div className="right">
                <div>{dur(i.duration_in_seconds)}</div>
                <div className="muted small">{i.ended_by?.replace("_", " ").toLowerCase()}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card detail">
        {!selected ? (
          <div className="empty">Select a call to read the transcript and play the recording.</div>
        ) : (
          <>
            <div className="card-head">
              {when(selected.start_datetime)} · {dur(selected.duration_in_seconds)}
            </div>
            {selected.has_audio && (
              <div className="player">
                <audio
                  key={selected.interaction_id}
                  controls
                  preload="metadata"
                  src={`/api/calls/recording?id=${selected.interaction_id}`}
                />
                <a
                  className="link"
                  href={`/api/calls/recording?id=${selected.interaction_id}`}
                  download={`call-${selected.interaction_id.replace("/", "-")}.wav`}
                >
                  Download WAV
                </a>
              </div>
            )}
            <div className="scroll">
              {!msgs && <div className="empty">Loading transcript…</div>}
              {msgs?.length === 0 && <div className="empty">No transcript available.</div>}
              {msgs?.map((m) => (
                <div key={m.turn_id} className={`msg ${m.role === "user" ? "user" : "bot"}`}>
                  <div className="who">{m.role === "user" ? "Trainee" : "Meena"}</div>
                  <div className="bubble">{m.content}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
