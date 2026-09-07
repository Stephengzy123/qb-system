"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import SignOutButton from "@/components/sign-out-button";
import type { StaffSummary } from "@/lib/app-user";

export type View = "overview" | "library" | "classes" | "assignments";

const navItems: { id: View; label: string; icon: string; href: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂", href: "/dashboard" },
  { id: "library", label: "Question bank", icon: "▤", href: "/question-bank" },
  { id: "classes", label: "Classes", icon: "◉", href: "/classes" },
  { id: "assignments", label: "Assignments", icon: "✓", href: "/assignments" },
];

function Mark() {
  return <div className="mark" aria-hidden="true"><span>Q</span></div>;
}

function ProductEmpty({ icon, title, body, action, href }: { icon: string; title: string; body: string; action?: string; href?: string }) {
  return <div className="empty-state product-empty"><span>{icon}</span><h2>{title}</h2><p>{body}</p>{action && href && <Link className="primary-button" href={href}>{action}</Link>}</div>;
}

function Overview({ name, summary }: { name: string; summary: StaffSummary }) {
  const isEmpty = summary.questions === 0 && summary.assignments === 0 && summary.students === 0 && summary.needsAttention === 0;
  return <><header className="page-header"><div><p className="eyebrow">AOMA WORKSPACE</p><h1>Welcome, {name.split(" ")[0]}.</h1><p className="lede">Your question bank activity will appear here.</p></div></header><section className="metric-grid" aria-label="Question bank summary"><article className="metric-card accent-blue"><div className="metric-top"><span className="metric-icon">▤</span></div><strong>{summary.questions}</strong><span>Questions</span></article><article className="metric-card accent-violet"><div className="metric-top"><span className="metric-icon">✓</span></div><strong>{summary.assignments}</strong><span>Assignments</span></article><article className="metric-card accent-mint"><div className="metric-top"><span className="metric-icon">◉</span></div><strong>{summary.students}</strong><span>Students</span></article><article className="metric-card accent-amber"><div className="metric-top"><span className="metric-icon">!</span></div><strong>{summary.needsAttention}</strong><span>Items needing attention</span></article></section>{isEmpty && <section className="panel"><ProductEmpty icon="＋" title="Start building your question bank" body="Create a class or upload your first image-based question set. Real activity and assignments will appear here as you add them." action="Create a class" href="/classes" /></section>}</>;
}

function Library() {
  return <><header className="page-header compact"><div><p className="eyebrow">CONTENT</p><h1>Question bank</h1><p className="lede">Organize, review, and reuse your question sets.</p></div></header><section className="panel"><ProductEmpty icon="↑" title="No question sets yet" body="Upload a folder or ZIP of question images to create the first set. Nothing shown here is sample content." action="View import workspace" href="/imports" /></section></>;
}

function Classes() {
  return <><header className="page-header compact"><div><p className="eyebrow">PEOPLE</p><h1>Classes</h1><p className="lede">Manage students, materials, and enrollment requests.</p></div></header><section className="panel"><ProductEmpty icon="◉" title="No classes yet" body="Classes will appear here after an authorized teacher or administrator creates one. Pending student requests will be limited to the teacher’s assigned scope." /></section></>;
}

function Assignments() {
  return <><header className="page-header compact"><div><p className="eyebrow">COURSEWORK</p><h1>Assignments</h1><p className="lede">Create, publish, and review assigned work.</p></div><Link className="primary-button" href="/assignments/new">＋ Create assignment</Link></header><section className="panel"><ProductEmpty icon="✓" title="No assignments yet" body="Assignments will appear here after you create and publish them from a real question set." /></section></>;
}

export default function Workspace({ view, user, summary, children }: { view: View; user: { displayName: string; role: string }; summary?: StaffSummary; children?: ReactNode }) {
  const initials = user.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><Mark /><span><strong>Question Bank</strong><small>AOMA</small></span></div><nav aria-label="Main navigation">{navItems.map((item) => <Link key={item.id} href={item.href} className={view === item.id ? "active" : ""}><span className="nav-icon">{item.icon}</span>{item.label}</Link>)}</nav><div className="sidebar-bottom"><Link href="/student"><span className="nav-icon">◇</span>Student view</Link><Link href="/imports"><span className="nav-icon">⌁</span>Import history</Link><Link href="/settings"><span className="nav-icon">⚙</span>Settings</Link><div className="profile"><span>{initials}</span><div><strong>{user.displayName}</strong><small>{user.role}</small></div><SignOutButton /></div></div></aside><main className="main-content"><div className="mobile-bar"><div className="brand"><Mark /><strong>AOMA Question Bank</strong></div><nav aria-label="Mobile navigation">{navItems.map((item) => <Link key={item.id} href={item.href} aria-label={item.label} className={view === item.id ? "active" : ""}>{item.icon}</Link>)}</nav></div>{children ?? <>{view === "overview" && <Overview name={user.displayName} summary={summary ?? { questions: 0, assignments: 0, students: 0, needsAttention: 0 }} />}{view === "library" && <Library />}{view === "classes" && <Classes />}{view === "assignments" && <Assignments />}</>}</main></div>;
}
