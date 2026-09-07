"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = { id: string; name: string; email: string; status: string };

export default function ClassDetail({ id, name, members }: { id: string; name: string; members: Member[] }) {
  const router = useRouter();
  const [working, setWorking] = useState("");
  const pending = members.filter((member) => member.status === "pending");
  const active = members.filter((member) => member.status === "active");

  async function decide(membershipId: string, status: "active" | "rejected") {
    setWorking(membershipId);
    await fetch(`/api/classes/${id}/memberships/${membershipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setWorking(""); router.refresh();
  }

  return <><header className="page-header compact"><div><p className="eyebrow">CLASS</p><h1>{name}</h1><p className="lede">Enrollment and student access</p></div><Link className="secondary-button" href="/classes">Back to classes</Link></header><section className="panel member-panel"><div className="panel-heading"><div><h2>Pending requests</h2><p>Only teachers assigned to this class and administrators can decide.</p></div><b className="nav-badge">{pending.length}</b></div>{pending.length === 0 ? <div className="compact-empty">No pending enrollment requests.</div> : pending.map((member) => <div className="member-row" key={member.id}><span className="class-avatar">{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><span><strong>{member.name}</strong><small>{member.email}</small></span><div><button disabled={working === member.id} onClick={() => decide(member.id, "rejected")}>Reject</button><button className="approve" disabled={working === member.id} onClick={() => decide(member.id, "active")}>Approve</button></div></div>)}</section><section className="panel member-panel"><div className="panel-heading"><div><h2>Active students</h2><p>{active.length} enrolled</p></div></div>{active.length === 0 ? <div className="compact-empty">No active students yet.</div> : active.map((member) => <div className="member-row" key={member.id}><span className="class-avatar">{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><span><strong>{member.name}</strong><small>{member.email}</small></span><b className="status-badge connected">Active</b></div>)}</section></>;
}
