"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type JoinedClass = { id: string; className: string; status: "pending" | "active" | "rejected"; requestedAt: string };

export default function JoinClassForm({ onJoined }: { onJoined?: (joinedClass: JoinedClass) => void }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setError(""); setMessage("");
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    const response = await fetch("/api/classes/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const result = await response.json(); setWorking(false);
    if (!response.ok) { setError(result.error ?? "Unable to request enrollment."); return; }
    setMessage(result.status === "active"
      ? `You are already enrolled in ${result.className}.`
      : `Request sent to ${result.className}. A teacher or administrator must approve it.`);
    onJoined?.(result);
    event.currentTarget.reset();
    if (!onJoined) router.refresh();
  }

  return <section className="panel join-class"><div><h2>Join a class</h2><p>Enter the code your teacher gave you.</p></div><form onSubmit={submit}><input name="code" placeholder="AOMA-XXXXXXXX" autoCapitalize="characters" required /><button className="primary-button" disabled={working}>{working ? "Sending…" : "Request access"}</button></form>{error && <p className="auth-error">{error}</p>}{message && <p className="join-success" role="status">{message}</p>}</section>;
}
