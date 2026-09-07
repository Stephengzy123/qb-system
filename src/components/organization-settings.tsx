"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function OrganizationSettings({ name }: { name: string }) {
  const router = useRouter();
  const [currentName, setCurrentName] = useState(name);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    setError("");
    const data = new FormData(event.currentTarget);
    const nextName = String(data.get("name") ?? "").trim();
    const response = await fetch("/api/admin/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to rename the organization.");
      return;
    }
    setCurrentName(result.name);
    setMessage("Organization name updated.");
    router.refresh();
  }

  return <section className="panel organization-settings">
    <div className="panel-heading"><div><h2>Organization</h2><p>This name appears throughout the administrator and student workspaces.</p></div></div>
    <form onSubmit={save}>
      <label><span>Organization name</span><input name="name" key={currentName} defaultValue={currentName} maxLength={120} required /></label>
      <button className="primary-button" disabled={working}>{working ? "Saving…" : "Save name"}</button>
    </form>
    {message && <p className="form-success" role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
  </section>;
}
