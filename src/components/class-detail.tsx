"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Member = { id: string; name: string; username: string | null; status: string };

export default function ClassDetail({ id, name, class_code, members }: { id: string; name: string; class_code: string | null; members: Member[] }) {
  const router = useRouter();
  const [className, setClassName] = useState(name);
  const [memberItems, setMemberItems] = useState(members);
  const [working, setWorking] = useState("");
  const [code, setCode] = useState(class_code);
  const [codeMessage, setCodeMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const pending = memberItems.filter((member) => member.status === "pending");
  const active = memberItems.filter((member) => member.status === "active");

  async function decide(membershipId: string, status: "active" | "rejected") {
    if (working) return;
    const original = memberItems.find((member) => member.id === membershipId);
    if (!original) return;
    setWorking(membershipId); setMembershipError("");
    setMemberItems((current) => status === "active"
      ? current.map((member) => member.id === membershipId ? { ...member, status } : member)
      : current.filter((member) => member.id !== membershipId));
    const response = await fetch(`/api/classes/${id}/memberships/${membershipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setWorking("");
    if (!response.ok) {
      const result = await response.json();
      setMemberItems((current) => [original, ...current.filter((member) => member.id !== membershipId)]);
      setMembershipError(result.error ?? "Unable to resolve this enrollment request.");
    }
  }

  async function removeMember(member: Member) {
    if (working || !window.confirm(`Remove ${member.name} from ${className}? They can request to join again later.`)) return;
    setWorking(member.id); setMembershipError("");
    setMemberItems((current) => current.filter((item) => item.id !== member.id));
    const response = await fetch(`/api/classes/${id}/memberships/${member.id}`, { method: "DELETE" });
    setWorking("");
    if (!response.ok) {
      const result = await response.json();
      setMemberItems((current) => current.some((item) => item.id === member.id) ? current : [...current, member]);
      setMembershipError(result.error ?? "Unable to remove this class member.");
    }
  }

  async function rotateCode() {
    if (code && !window.confirm("Generate a new class code? The current code will stop working.")) return;
    setWorking("code"); setCodeMessage("");
    const response = await fetch(`/api/classes/${id}/code`, { method: "POST" });
    const result = await response.json();
    setWorking("");
    if (!response.ok) { setCodeMessage(result.error ?? "Unable to generate a class code."); return; }
    setCode(result.code);
    setCodeMessage("New code generated. The previous code no longer works.");
  }

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCodeMessage("Class code copied.");
  }

  async function renameClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking("settings"); setSettingsMessage("");
    const newName = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    const response = await fetch(`/api/classes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
    const result = await response.json(); setWorking("");
    if (!response.ok) { setSettingsMessage(result.error ?? "Unable to rename the class."); return; }
    setClassName(result.name); setSettingsMessage("Class name updated."); router.refresh();
  }

  async function deleteClass() {
    if (deleteConfirmation !== className) return;
    setWorking("delete"); setSettingsMessage("");
    const response = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    if (!response.ok) { const result = await response.json(); setWorking(""); setSettingsMessage(result.error ?? "Unable to delete the class."); return; }
    router.push("/admin/classes"); router.refresh();
  }

  return <>
    <header className="page-header compact"><div><p className="eyebrow">CLASS</p><h1>{className}</h1><p className="lede">Enrollment and student access</p></div><Link className="secondary-button" href="/admin/classes">Back to classes</Link></header>
    <section className="panel class-code-panel"><div><p className="eyebrow">ENROLLMENT CODE</p>{code ? <strong>{code}</strong> : <h2>Generate a new code</h2>}<p>{code ? "Students enter this code to request access." : "This class predates reusable codes. Generate one for students to join."}</p>{codeMessage && <small role="status">{codeMessage}</small>}</div><div>{code && <button className="secondary-button" onClick={copyCode}>Copy code</button>}<button className="primary-button" disabled={working === "code"} onClick={rotateCode}>{working === "code" ? "Generating…" : code ? "Rotate code" : "Generate code"}</button></div></section>
    {membershipError && <p className="attention-error" role="alert">{membershipError}</p>}
    <section className="panel member-panel"><div className="panel-heading"><div><h2>Pending requests</h2><p>Only teachers assigned to this class and administrators can decide.</p></div><b className="nav-badge">{pending.length}</b></div>{pending.length === 0 ? <div className="compact-empty">No pending enrollment requests.</div> : pending.map((member) => <div className="member-row" key={member.id}><span className="class-avatar">{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><span><strong>{member.name}</strong><small>@{member.username ?? "student"}</small></span><div><button disabled={working === member.id} onClick={() => decide(member.id, "rejected")}>Reject</button><button className="approve" disabled={working === member.id} onClick={() => decide(member.id, "active")}>Approve</button></div></div>)}</section>
    <section className="panel member-panel"><div className="panel-heading"><div><h2>Manage class members</h2><p>{active.length} enrolled</p></div></div>{active.length === 0 ? <div className="compact-empty">No active students yet.</div> : active.map((member) => <div className="member-row" key={member.id}><span className="class-avatar">{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><span><strong>{member.name}</strong><small>@{member.username ?? "student"}</small></span><div><b className="status-badge connected">Active</b><button className="remove-member" disabled={working === member.id} onClick={() => removeMember(member)}>{working === member.id ? "Removing…" : "Remove"}</button></div></div>)}</section>
    <section className="panel class-settings"><div className="panel-heading"><div><h2>Class settings</h2><p>Update the class name or remove it from active use.</p></div></div><form className="rename-class" onSubmit={renameClass}><label><span>Class name</span><input name="name" defaultValue={className} maxLength={120} required /></label><button className="primary-button" disabled={working === "settings"}>{working === "settings" ? "Saving…" : "Save name"}</button></form>{settingsMessage && <p className="settings-message" role="status">{settingsMessage}</p>}<div className="danger-zone"><div><h2>Delete class</h2><p>Students lose access and the class code is revoked. Historical assignments and submissions are preserved.</p></div>{!showDelete ? <button className="danger-button" onClick={() => setShowDelete(true)}>Delete class</button> : <div className="delete-confirm"><label><span>Type <strong>{className}</strong> to confirm</span><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><div><button className="secondary-button" onClick={() => { setShowDelete(false); setDeleteConfirmation(""); }}>Cancel</button><button className="danger-button" disabled={deleteConfirmation !== className || working === "delete"} onClick={deleteClass}>{working === "delete" ? "Deleting…" : "Confirm delete"}</button></div></div>}</div></section>
  </>;
}
