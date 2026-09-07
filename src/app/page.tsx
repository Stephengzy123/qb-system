"use client";

import { useMemo, useState } from "react";

type View = "overview" | "library" | "classes" | "assignments";

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "library", label: "Question bank", icon: "▤" },
  { id: "classes", label: "Classes", icon: "◉" },
  { id: "assignments", label: "Assignments", icon: "✓" },
];

const assignments = [
  { title: "Integration review", className: "Calculus 12 · Block A", progress: "26 / 28", due: "Today, 11:59 PM", status: "Open", tone: "blue" },
  { title: "Normal distributions", className: "Statistics 12", progress: "21 / 24", due: "Sep 9", status: "Open", tone: "mint" },
  { title: "Limits checkpoint", className: "Calculus 12 · Block B", progress: "30 / 30", due: "Sep 4", status: "Ready to release", tone: "violet" },
];

const sets = [
  { name: "Integration Practice", path: "Calculus / Unit 4", questions: 204, missing: 3, updated: "12 min ago" },
  { name: "Normal Distribution", path: "Statistics / Unit 2", questions: 86, missing: 0, updated: "Yesterday" },
  { name: "Limits & Continuity", path: "Calculus / Unit 1", questions: 120, missing: 0, updated: "Sep 3" },
  { name: "Probability Review", path: "Statistics / Review", questions: 72, missing: 5, updated: "Aug 29" },
];

function Mark() {
  return <div className="mark" aria-hidden="true"><span>Q</span></div>;
}

function Overview({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <>
    <header className="page-header">
      <div><p className="eyebrow">SUNDAY, SEPTEMBER 6</p><h1>Good afternoon, Stephen.</h1><p className="lede">Here’s what needs your attention across the question bank.</p></div>
      <button className="primary-button" onClick={() => onNavigate("assignments")}><span aria-hidden="true">＋</span> Create assignment</button>
    </header>
    <section className="metric-grid" aria-label="Question bank summary">
      <article className="metric-card accent-blue"><div className="metric-top"><span className="metric-icon">▤</span><span className="trend">+86 this week</span></div><strong>2,418</strong><span>Questions</span></article>
      <article className="metric-card accent-violet"><div className="metric-top"><span className="metric-icon">✓</span><span className="trend">3 active</span></div><strong>12</strong><span>Assignments</span></article>
      <article className="metric-card accent-mint"><div className="metric-top"><span className="metric-icon">◉</span><span className="trend">Across 4 classes</span></div><strong>106</strong><span>Students</span></article>
      <article className="metric-card accent-amber"><div className="metric-top"><span className="metric-icon">!</span><span className="trend warm">Needs review</span></div><strong>8</strong><span>Missing answer keys</span></article>
    </section>
    <div className="dashboard-grid">
      <section className="panel assignment-panel">
        <div className="panel-heading"><div><h2>Active assignments</h2><p>Submission progress across your classes</p></div><button className="text-button" onClick={() => onNavigate("assignments")}>View all <span>→</span></button></div>
        <div className="assignment-list">{assignments.map((item) => { const [done, total] = item.progress.split(" / ").map(Number); return <article className="assignment-row" key={item.title}><div className={`assignment-symbol ${item.tone}`}>↗</div><div className="assignment-copy"><h3>{item.title}</h3><p>{item.className}</p></div><div className="progress-block"><div className="progress-label"><span>{item.progress} submitted</span><b>{Math.round((done / total) * 100)}%</b></div><div className="progress-track"><i style={{ width: `${(done / total) * 100}%` }} /></div></div><div className="due"><span>{item.due}</span><b className={item.status === "Ready to release" ? "release" : "open"}>{item.status}</b></div><button className="icon-button" aria-label={`More options for ${item.title}`}>•••</button></article>; })}</div>
      </section>
      <aside className="panel attention-panel">
        <div className="panel-heading"><div><h2>Needs attention</h2><p>Quick actions waiting for you</p></div></div>
        <button className="attention-item" onClick={() => onNavigate("classes")}><span className="attention-icon person">♙</span><span><strong>4 enrollment requests</strong><small>Across 2 classes</small></span><b>→</b></button>
        <button className="attention-item" onClick={() => onNavigate("library")}><span className="attention-icon key">⌁</span><span><strong>8 missing answer keys</strong><small>In 2 question sets</small></span><b>→</b></button>
        <button className="attention-item"><span className="attention-icon broken">◇</span><span><strong>1 broken asset</strong><small>Detected by reconciliation</small></span><b>→</b></button>
      </aside>
    </div>
    <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recently updated sets</h2><p>Your latest question-bank activity</p></div><button className="text-button" onClick={() => onNavigate("library")}>Open question bank <span>→</span></button></div><SetTable items={sets.slice(0,3)} /></section>
  </>;
}

function SetTable({ items }: { items: typeof sets }) {
  return <div className="set-table"><div className="set-row set-head"><span>Set</span><span>Questions</span><span>Answer keys</span><span>Updated</span><span /></div>{items.map((set) => <div className="set-row" key={set.name}><span className="set-name"><i>▤</i><span><strong>{set.name}</strong><small>{set.path}</small></span></span><span>{set.questions}</span><span>{set.missing ? <b className="missing">{set.missing} missing</b> : <b className="complete">Complete</b>}</span><span className="muted">{set.updated}</span><button className="icon-button" aria-label={`More options for ${set.name}`}>•••</button></div>)}</div>;
}

function Library() {
  const [query, setQuery] = useState("");
  const visibleSets = useMemo(() => sets.filter((set) => `${set.name} ${set.path}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <><header className="page-header compact"><div><p className="eyebrow">CONTENT</p><h1>Question bank</h1><p className="lede">Organize, review, and reuse your question sets.</p></div><button className="primary-button">↑ Upload set</button></header><div className="toolbar"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sets and folders" /></label><button className="secondary-button">＋ New folder</button></div><div className="library-layout"><aside className="folder-tree panel"><p className="eyebrow">FOLDERS</p><button className="folder active">▾ <span>All questions</span><b>2,418</b></button><button className="folder">▾ <span>Calculus</span><b>1,284</b></button><button className="folder nested">└ <span>Unit 4</span><b>204</b></button><button className="folder">▾ <span>Statistics</span><b>914</b></button><button className="folder">▸ <span>Archive</span><b>220</b></button></aside><section className="panel library-panel"><div className="panel-heading"><div><h2>All sets</h2><p>{visibleSets.length} sets shown</p></div><button className="secondary-button">Sort: Recently updated</button></div><SetTable items={visibleSets} /></section></div></>;
}

function Classes() {
  const entries = [["Calculus 12 · Block A", "28 students", "CALC-A7K2", "2 pending"], ["Calculus 12 · Block B", "30 students", "CALC-B9M4", "No requests"], ["Statistics 12", "24 students", "STAT-P4Q8", "2 pending"], ["AP Calculus Review", "24 students", "APCR-X2N6", "No requests"]];
  return <><header className="page-header compact"><div><p className="eyebrow">PEOPLE</p><h1>Classes</h1><p className="lede">Manage students, materials, and enrollment requests.</p></div><button className="primary-button">＋ Create class</button></header><section className="class-grid">{entries.map(([name,count,code,pending], i) => <article className="class-card panel" key={name}><div className={`class-stripe stripe-${i}`} /><div className="class-top"><span className="class-avatar">{name.split(" ").slice(0,2).map(x=>x[0]).join("")}</span><button className="icon-button">•••</button></div><h2>{name}</h2><p>{count} · {pending}</p><div className="code-row"><span>Class code</span><button>{code} <b>⧉</b></button></div><div className="class-actions"><button>View class</button><button>Assignments</button></div></article>)}</section></>;
}

function Assignments() {
  return <><header className="page-header compact"><div><p className="eyebrow">COURSEWORK</p><h1>Assignments</h1><p className="lede">Create, publish, and review assigned work.</p></div><button className="primary-button">＋ Create assignment</button></header><section className="panel"><div className="tabs"><button className="active">Open <span>3</span></button><button>Drafts <span>2</span></button><button>Closed <span>7</span></button></div><div className="assignment-list expanded">{assignments.map((item) => <article className="assignment-row" key={item.title}><div className={`assignment-symbol ${item.tone}`}>↗</div><div className="assignment-copy"><h3>{item.title}</h3><p>{item.className}</p></div><div><small className="table-label">SUBMISSIONS</small><strong className="table-value">{item.progress}</strong></div><div><small className="table-label">DUE</small><strong className="table-value">{item.due}</strong></div><b className={item.status === "Ready to release" ? "release" : "open"}>{item.status}</b><button className="icon-button">•••</button></article>)}</div></section></>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><Mark /><span><strong>Question Bank</strong><small>Northstar Academy</small></span></div><nav aria-label="Main navigation">{navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === "classes" && <b className="nav-badge">4</b>}</button>)}</nav><div className="sidebar-bottom"><button><span className="nav-icon">⌁</span>Import history</button><button><span className="nav-icon">⚙</span>Settings</button><div className="profile"><span>SG</span><div><strong>Stephen Guo</strong><small>Administrator</small></div><button aria-label="Open profile menu">⌄</button></div></div></aside><main className="main-content"><div className="mobile-bar"><div className="brand"><Mark /><strong>Question Bank</strong></div><button aria-label="Open menu">☰</button></div>{view === "overview" && <Overview onNavigate={setView} />}{view === "library" && <Library />}{view === "classes" && <Classes />}{view === "assignments" && <Assignments />}</main></div>;
}
