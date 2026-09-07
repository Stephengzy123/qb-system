import SignOutButton from "@/components/sign-out-button";
import JoinClassForm from "@/components/join-class-form";
import { getStudentAssignments, requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await requireAppUser();
  const assignments = await getStudentAssignments(user.id);

  return <div className="student-shell"><header className="student-header"><div className="student-brand"><div className="mark"><span>Q</span></div><span><strong>AOMA</strong><small>Student workspace</small></span></div><div className="student-account"><span>{user.displayName}</span><SignOutButton /></div></header><main className="student-main"><div className="student-welcome"><p className="eyebrow">{user.role === "student" ? "MY WORK" : "STUDENT VIEW"}</p><h1>{user.role === "student" ? `Welcome, ${user.displayName.split(" ")[0]}.` : "Student workspace preview"}</h1><p className="lede">{user.role === "student" ? "Your current assignments and practice materials appear here." : "This is the empty state students see before they receive assigned work."}</p></div>{user.role === "student" && <JoinClassForm />}{assignments.length === 0 ? <section className="panel student-empty"><div className="empty-illustration">✓</div><h2>No open assignments</h2><p>New work will appear here after class enrollment is approved and a teacher publishes an assignment.</p></section> : <section className="student-assignment-grid">{assignments.map((assignment) => <a className="panel student-assignment-card" href={`/student/assignments/${assignment.id}`} key={assignment.id}><span className="student-card-icon">↗</span><div><p>{assignment.class_name}</p><h2>{assignment.title}</h2><small>{assignment.due_at ? `Due ${assignment.due_at.toLocaleString()}` : "No due date"}</small></div><b>{assignment.student_status === "submitted" ? "Submitted" : assignment.student_status ? "Continue" : "Start"} →</b></a>)}</section>}</main></div>;
}
