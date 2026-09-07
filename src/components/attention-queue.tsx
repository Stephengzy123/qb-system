"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AccountAttentionItem, EnrollmentAttentionItem } from "@/lib/app-user";

export default function AttentionQueue({ enrollments, accounts }: { enrollments: EnrollmentAttentionItem[]; accounts: AccountAttentionItem[] }) {
  const router = useRouter();
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const total = enrollments.length + accounts.length;

  async function decideEnrollment(item: EnrollmentAttentionItem, status: "active" | "rejected") {
    setWorking(item.id); setError("");
    const response = await fetch(`/api/classes/${item.class_id}/memberships/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setWorking("");
    if (!response.ok) { const result = await response.json(); setError(result.error ?? "Unable to resolve this request."); return; }
    router.refresh();
  }

  async function decideAccount(item: AccountAttentionItem, status: "active" | "rejected") {
    setWorking(item.id); setError("");
    const response = await fetch(`/api/users/${item.id}/approval`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setWorking("");
    if (!response.ok) { const result = await response.json(); setError(result.error ?? "Unable to resolve this account."); return; }
    router.refresh();
  }

  if (total === 0) return <section className="panel"><div className="empty-state product-empty"><span>✓</span><h2>Nothing needs attention</h2><p>New enrollment or account approval requests will appear here.</p><Link className="secondary-button" href="/dashboard">Back to dashboard</Link></div></section>;

  return <>{error && <p className="attention-error" role="alert">{error}</p>}
    {enrollments.length > 0 && <section className="panel review-panel"><div className="panel-heading"><div><h2>Enrollment requests</h2><p>Approve access only for students who belong in the selected class.</p></div><b className="nav-badge">{enrollments.length}</b></div>{enrollments.map((item) => <article className="review-row" key={item.id}><span className="class-avatar">{item.display_name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{item.display_name}</strong><small>@{item.username ?? "student"} · requesting <Link href={`/classes/${item.class_id}`}>{item.class_name}</Link></small><time>Requested {new Date(item.requested_at).toLocaleString()}</time></div><div><button className="secondary-button" disabled={working === item.id} onClick={() => decideEnrollment(item, "rejected")}>Reject</button><button className="primary-button" disabled={working === item.id} onClick={() => decideEnrollment(item, "active")}>{working === item.id ? "Working…" : "Approve"}</button></div></article>)}</section>}
    {accounts.length > 0 && <section className="panel review-panel"><div className="panel-heading"><div><h2>Account approvals</h2><p>Administrator review for accounts awaiting activation.</p></div><b className="nav-badge">{accounts.length}</b></div>{accounts.map((item) => <article className="review-row" key={item.id}><span className="class-avatar">{item.display_name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{item.display_name}</strong><small>@{item.username ?? "user"}</small><time>Created {new Date(item.created_at).toLocaleString()}</time></div><div><button className="secondary-button" disabled={working === item.id} onClick={() => decideAccount(item, "rejected")}>Reject</button><button className="primary-button" disabled={working === item.id} onClick={() => decideAccount(item, "active")}>{working === item.id ? "Working…" : "Approve"}</button></div></article>)}</section>}
  </>;
}
