"use client";

import { useEffect, useState } from "react";

type Check = { configured: boolean; connected: boolean };
type Status = { database: Check; r2: Check; checkedAt: string };

function StateBadge({ check }: { check?: Check }) {
  if (!check) return <b className="status-badge checking">Checking…</b>;
  if (!check.configured) return <b className="status-badge unset">Not configured</b>;
  if (!check.connected) return <b className="status-badge failed">Connection failed</b>;
  return <b className="status-badge connected">Connected</b>;
}

export default function ServiceStatus() {
  const [status, setStatus] = useState<Status>();
  const [failed, setFailed] = useState(false);

  async function refresh() {
    setFailed(false);
    try {
      const response = await fetch("/api/health/services", { cache: "no-store" });
      if (!response.ok) throw new Error("Health check failed");
      setStatus(await response.json());
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/health/services", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Health check failed");
        return response.json() as Promise<Status>;
      })
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  return <>
    <header className="page-header compact"><div><p className="eyebrow">DEPLOYMENT</p><h1>Settings</h1><p className="lede">Check the services connected to this AOMA deployment.</p></div><button className="secondary-button" onClick={refresh}>Refresh status</button></header>
    <section className="panel settings-panel">
      <div className="panel-heading"><div><h2>Service connections</h2><p>Credentials are read securely from the deployment environment.</p></div>{status && <span className="checked-time">Checked {new Date(status.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}</div>
      {failed && <div className="setup-message error">The service check could not run. Try again in a moment.</div>}
      <div className="service-row"><span className="service-icon database">DB</span><span><strong>PostgreSQL database</strong><small>Question data, classes, assignments, and progress</small></span><StateBadge check={status?.database} /></div>
      <div className="service-row"><span className="service-icon storage">R2</span><span><strong>Cloudflare R2</strong><small>Private question images and upload staging</small></span><StateBadge check={status?.r2} /></div>
    </section>
  </>;
}
