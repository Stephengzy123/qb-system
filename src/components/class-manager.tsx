"use client";

import { FormEvent, useState } from "react";

export default function ClassManager({ classes }: { classes: { id: string; name: string; students: number; pending: number }[] }) {
  const [items, setItems] = useState(classes);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreating(true); setError("");
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    const response = await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Unable to create class."); setCreating(false); return; }
    setItems((current) => [{ id: result.id, name: result.name, students: 0, pending: 0 }, ...current]);
    setCode(result.code); setCreating(false); event.currentTarget.reset();
  }

  return <><header className="page-header compact"><div><p className="eyebrow">PEOPLE</p><h1>Classes</h1><p className="lede">Create classes and review scoped enrollment requests.</p></div></header><section className="panel class-create"><div><h2>Create a class</h2><p>A random class code is created and remains available from the class page.</p></div><form onSubmit={create}><input name="name" placeholder="Class name" maxLength={120} required /><button className="primary-button" disabled={creating}>{creating ? "Creating…" : "Create class"}</button></form>{error && <p className="auth-error">{error}</p>}{code && <div className="created-code" role="status"><span>New class code</span><strong>{code}</strong><small>Students use it to request enrollment. You can view it again from the class page.</small></div>}</section>{items.length === 0 ? <section className="panel"><div className="empty-state product-empty"><span>◉</span><h2>No classes yet</h2><p>Create the first class to generate a student enrollment code.</p></div></section> : <section className="class-grid real-classes">{items.map((item) => <a className="class-card panel" href={`/admin/classes/${item.id}`} key={item.id}><span className="class-avatar">{item.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><h2>{item.name}</h2><p>{item.students} students · {item.pending} pending</p><b>Manage class →</b></a>)}</section>}</>;
}
