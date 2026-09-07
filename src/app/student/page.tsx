import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";
import JoinClassForm from "@/components/join-class-form";
import LocalTime from "@/components/local-time";
import ClassPreviewSelector from "@/components/class-preview-selector";
import { getStudentAssignments, requireAppUser } from "@/lib/app-user";
import { getClassPreviewAssignments, listClasses } from "@/lib/classes";

export const dynamic = "force-dynamic";

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const user = await requireAppUser();
  const isPreview = user.role !== "student";
  const classes = isPreview ? await listClasses(user) : [];
  const requestedClassId = isPreview ? (await searchParams).classId ?? "" : "";
  const selectedClass = classes.find((item) => item.id === requestedClassId);
  const assignments = isPreview
    ? selectedClass ? await getClassPreviewAssignments(user, selectedClass.id) : []
    : await getStudentAssignments(user.id);

  return <div className="student-shell">
    <header className="student-header">
      <div className="student-brand"><div className="mark"><span>Q</span></div><span><strong>AOMA</strong><small>Student workspace</small></span></div>
      <div className="student-account">{isPreview ? <Link className="secondary-button student-exit" href="/dashboard">← Exit student view</Link> : <Link className="secondary-button student-exit" href="/account">Account</Link>}<span>{user.displayName}</span><SignOutButton /></div>
    </header>
    {isPreview && <div className="preview-banner"><strong>Student view preview</strong><ClassPreviewSelector classes={classes} selectedId={selectedClass?.id ?? ""} /><span>{selectedClass ? `Viewing ${selectedClass.name} as a new student.` : "Select a class to begin."}</span><Link href="/dashboard">Exit preview</Link></div>}
    <main className="student-main">
      <div className="student-welcome"><p className="eyebrow">MY WORK</p><h1>{isPreview ? "Welcome, Student." : `Welcome, ${user.displayName.split(" ")[0]}.`}</h1><p className="lede">Your current assignments and practice materials appear here.</p></div>
      {(!isPreview || selectedClass) && <JoinClassForm preview={isPreview} />}
      {assignments.length === 0
        ? <section className="panel student-empty"><div className="empty-illustration">✓</div><h2>{isPreview && !selectedClass ? "Select a class to begin" : "No open assignments"}</h2><p>{isPreview && !selectedClass ? "The preview will update to show what a student in that class can access." : "New work will appear here after class enrollment is approved and a teacher publishes an assignment."}</p></section>
        : <section className="student-assignment-grid">{assignments.map((assignment) => { const contents = <><span className="student-card-icon">↗</span><div><p>{assignment.class_name}</p><h2>{assignment.title}</h2><small>{assignment.due_at ? <LocalTime value={assignment.due_at.toISOString()} prefix="Due " /> : "No due date"}</small></div><b>{assignment.student_status === "submitted" ? "Submitted" : assignment.student_status ? "Continue" : "Start"} →</b></>; return isPreview ? <article className="panel student-assignment-card" key={assignment.id}>{contents}</article> : <a className="panel student-assignment-card" href={`/student/assignments/${assignment.id}`} key={assignment.id}>{contents}</a>; })}</section>}
    </main>
  </div>;
}
