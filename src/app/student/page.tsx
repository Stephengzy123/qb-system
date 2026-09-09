import DiscardProgress from "@/components/discard-progress";
import ErrorPractice from "@/components/error-practice";
import AssignmentHistory from "@/components/assignment-history";
import { studentHistory } from "@/lib/learning";
import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";
import JoinClassForm from "@/components/join-class-form";
import LocalTime from "@/components/local-time";
import ClassPreviewSelector from "@/components/class-preview-selector";
import ThemeToggle from "@/components/theme-toggle";
import { getStudentAssignments, requireAppUser } from "@/lib/app-user";
import { getClassPreviewAssignments, listClasses } from "@/lib/classes";
import { getOrganizationName } from "@/lib/organization";
import BrandMark from "@/components/brand-mark";

export const dynamic = "force-dynamic";

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const user = await requireAppUser();
  const isPreview = user.role !== "student";
  const classes = isPreview ? await listClasses(user) : [];
  const requestedClassId = isPreview ? (await searchParams).classId ?? "" : "";
  const selectedClass = classes.find((item) => item.id === requestedClassId);
  const allAssignments = isPreview
    ? selectedClass ? await getClassPreviewAssignments(user, selectedClass.id) : []
    : await getStudentAssignments(user.id);
  const assignments=allAssignments.filter(assignment=>assignment.student_status!=="submitted");
  const history=isPreview?[]:await studentHistory(user.id);
  const completed=history.filter(item=>item.status==="submitted");
  const practices=history.filter(item=>item.practice_student_id && item.status!=="submitted");
  const organizationName = await getOrganizationName();

  return <div className="student-shell">
    <header className="student-header">
      <div className="student-brand"><BrandMark /><span><strong>{organizationName}</strong><small>Student workspace</small></span></div>
      <div className="student-account"><ThemeToggle />{isPreview ? <Link className="secondary-button student-exit" href="/admin/dashboard">← Exit student view</Link> : <Link className="secondary-button student-exit" href="/student/account">Account</Link>}<span>{user.displayName}</span><SignOutButton /></div>
    </header>
    {isPreview && <div className="preview-banner"><strong>Student view preview</strong><ClassPreviewSelector classes={classes} selectedId={selectedClass?.id ?? ""} /><span>{selectedClass ? `Viewing ${selectedClass.name} as a new student.` : "Select a class to begin."}</span><Link href="/admin/dashboard">Exit preview</Link></div>}
    <main className="student-main">
      <div className="student-welcome"><p className="eyebrow">MY WORK</p><h1>{isPreview ? "Welcome, Student." : `Welcome, ${user.displayName.split(" ")[0]}.`}</h1><p className="lede">Your current assignments and practice materials appear here.</p></div>
      {(!isPreview || selectedClass) && <JoinClassForm preview={isPreview} />}
      {assignments.length === 0
        ? <section className="panel student-empty"><div className="empty-illustration">✓</div><h2>{isPreview && !selectedClass ? "Select a class to begin" : "No open assignments"}</h2><p>{isPreview && !selectedClass ? "The preview will update to show what a student in that class can access." : "New work will appear here after class enrollment is approved and a teacher publishes an assignment."}</p></section>
        : <section className="student-assignment-grid">{assignments.map((assignment) => { const contents = <><span className="student-card-icon">↗</span><div><p>{assignment.class_name}</p><h2>{assignment.title}</h2><small>{assignment.due_at ? <LocalTime value={assignment.due_at.toISOString()} prefix="Due " /> : "No due date"}</small></div><b>{assignment.student_status === "submitted" ? "Submitted" : assignment.student_status === "in_progress" ? "Continue" : "View assignment"} →</b></>; return <div className="student-work-row" key={assignment.id}><a className="panel student-assignment-card" href={`/student/assignments/${assignment.id}`} key={assignment.id}>{contents}</a>{!isPreview&&<DiscardProgress studentId={user.id} assignmentId={assignment.id} revision={"revision" in assignment?assignment.revision as number:0} onlyIfDraft={assignment.student_status!=="in_progress"} />}</div>; })}</section>}
      {!isPreview && <><ErrorPractice />{practices.length>0&&<section className="panel answer-editor"><h2>Continue error practice</h2>{practices.map(item=><div className="student-work-row" key={item.id}><Link className="assignment-card-link assignment-history-card" href={`/student/assignments/${item.id}`}>Error practice · {item.total} questions →</Link><DiscardProgress studentId={user.id} assignmentId={item.id} revision={item.revision??0} practice /></div>)}</section>}</>}
      {!isPreview && <div className="completed-assignments"><AssignmentHistory items={completed} completedOnly /></div>}
    </main>
  </div>;
}
