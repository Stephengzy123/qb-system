import Link from 'next/link';
import LocalTime from '@/components/local-time';
import { notFound } from 'next/navigation';
import AssignmentViewer from '@/components/assignment-viewer';
import StudentWork from '@/components/student-work';
import StudentResult from '@/components/student-result';
import { requireAppUser } from '@/lib/app-user';
import { getAssignment } from '@/lib/assignments';
import { getSavedWork,getStudentResult } from '@/lib/learning';
export const dynamic='force-dynamic';
export default async function StudentAssignmentPage({params}:{params:Promise<{assignmentId:string}>}) {
  const user=await requireAppUser();
  const assignment=await getAssignment(user,(await params).assignmentId);
  if(!assignment)notFound();
  if(user.role!=='student')return <main className="student-main"><p><Link href="/student">← Student preview</Link></p><p className="upload-warning">Staff preview. Student submissions are disabled.</p><AssignmentViewer assignment={assignment} /></main>;
  const work=await getSavedWork(user.id,assignment.id);
  const result=work.status==='submitted'?await getStudentResult(user,assignment.id,user.id):null;
  return <main className="student-main"><p><Link href="/student">← My assignments</Link></p><header className="page-header"><div><p className="eyebrow">{assignment.class_name}</p><h1>{assignment.title}</h1>{assignment.due_at&&<p><LocalTime value={assignment.due_at.toISOString()} prefix="Due " /></p>}<p className="assignment-instructions">{assignment.instructions}</p></div></header>{result?<StudentResult result={result} assignmentId={assignment.id} />:<StudentWork key={`${assignment.id}-${work.revision}`} studentId={user.id} practice={Boolean(assignment.practice_student_id)} discardedRevision={work.discardedRevision} cooldownSeconds={work.cooldownSeconds} assignmentId={assignment.id} questions={assignment.questions} revision={work.revision} answers={work.answers} />}</main>;
}
