import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";
import JoinClassForm from "@/components/join-class-form";
import { getStudentAssignments, requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await requireAppUser();
  const assignments = await getStudentAssignments(user.id);
  const isPreview = user.role !== "student";

  return <div className="student-shell">
    <header className="student-header">
      <div className="student-brand"><div className="mark"><span>Q</span></div><span><strong>AOMA</strong><small>Student workspace</small></span></div>
      <div className="student-account">{isPreview ? <Link className="secondary-button student-exit" href="/dashboard">← Exit student view</Link> : <Link className="secondary-button student-exit" href="/account">Account</Link>}<span>{user.displayName}</span><SignOutButton /></div>
    </header>
    {isPreview && <div className="preview-banner"><strong>Student view preview</strong><span>You are viewing the workspace as a student would. Staff controls are hidden.</span><Link href="/dashboard">Exit preview</Link></div>}
    <main className="student-main">
      <div className="student-welcome"><p className="eyebrow">{isPreview ? "STUDENT VIEW" : "MY WORK"}</p><h1>{isPreview ? "Student workspace preview" : `Welcome, ${user.displayName.split(" ")[0]}.`}</h1><p className="lede">{isPreview ? "This is the empty state students see before they receive assigned work." : "Your current assignments and practice materials appear here."}</p></div>
      {!isPreview && <JoinClassForm />}
      {assignments.length === 0
        ? <section className="panel student-empty"><div className="empty-illustration">✓</div><h2>No open assignments</h2><p>New work will appear here after class enrollment is approved and a teacher publishes an assignment.</p></section>
        : <section className="student-assignment-grid">{assignments.map((assignment) => <a className="panel student-assignment-card" href={`/student/assignments/${assignment.id}`} key={assignment.id}><span className="student-card-icon">↗</span><div><p>{assignment.class_name}</p><h2>{assignment.title}</h2><small>{assignment.due_at ? `Due ${assignment.due_at.toLocaleString()}` : "No due date"}</small></div><b>{assignment.student_status === "submitted" ? "Submitted" : assignment.student_status ? "Continue" : "Start"} →</b></a>)}</section>}
    </main>
  </div>;
}
