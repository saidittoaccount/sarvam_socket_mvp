"use client";

import { useState } from "react";

export default function Login() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ passcode: value }),
    });
    if (r.ok) location.reload();
    else setError("Wrong passcode");
  }

  return (
    <main className="center">
      <form className="card login" onSubmit={submit}>
        <h1>Mock Call</h1>
        <p className="muted">Enter the team passcode to continue.</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Passcode"
        />
        {error && <div className="err">{error}</div>}
        <button className="btn primary" type="submit">
          Continue
        </button>
      </form>
    </main>
  );
}
