"use client";

import { useState } from "react";
import Call from "./call";
import History from "./history";

type Props = {
  agentName: string;
  orgId: string;
  workspaceId: string;
  appId: string;
  version?: number;
};

export default function App(props: Props) {
  const [tab, setTab] = useState<"call" | "history">("call");
  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="dot" />
          <div>
            <div className="title">{props.agentName}</div>
            <div className="muted small">Mock call simulator</div>
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === "call" ? "on" : ""} onClick={() => setTab("call")}>
            Call
          </button>
          <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>
            History
          </button>
        </nav>
      </header>
      {/* Both stay mounted so a live call survives switching tabs. */}
      <div hidden={tab !== "call"}>
        <Call {...props} />
      </div>
      <div hidden={tab !== "history"}>
        <History active={tab === "history"} />
      </div>
    </div>
  );
}
