import Link from 'next/link';
import LocalTime from '@/components/local-time';
import type { AssignmentListItem } from '@/lib/assignments';
export default function AssignmentList({assignments}:{assignments:AssignmentListItem[]}) {
  return <section className="panel">{assignments.length?assignments.map(assignment=><article className="upload-history" key={assignment.id}><h2><Link href={`/admin/assignments/${assignment.id}`}>{assignment.title}</Link></h2><p>{assignment.class_name} · {assignment.questions} questions · {assignment.status} · {assignment.submitted} submitted</p><p>{assignment.due_at?<LocalTime value={assignment.due_at.toISOString()} prefix="Due " />:'No due date'}</p></article>):<div className="empty-state"><h2>No assignments yet</h2><p>Select question sets and classes to assign your first work.</p><Link className="primary-button" href="/admin/assignments/new">Create assignment</Link></div>}</section>;
}
