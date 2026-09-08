import Link from 'next/link';
import {notFound} from 'next/navigation';
import Workspace from '@/components/workspace';
import StudentAccountManager from '@/components/student-account-manager';
import AssignmentHistory from '@/components/assignment-history';
import {requireAppUser} from '@/lib/app-user';
import {getOrganizationName} from '@/lib/organization';
import {listStudents} from '@/lib/students';
import {studentHistory} from '@/lib/learning';
import {accuracy} from '@/lib/learning-model';
export const dynamic='force-dynamic';
export default async function StudentProfile({params}:{params:Promise<{studentId:string}>}) {
  const user=await requireAppUser({staff:true});
  const {studentId}=await params;const students=await listStudents(user);const student=students.find(s=>s.id===studentId);if(!student)notFound();
  const linked=students.filter(s=>s.duplicate_of_id===studentId);
  return <Workspace view="students" user={user} organizationName={await getOrganizationName()}><p><Link href="/admin/students">← Students</Link></p><header className="page-header"><div><h1>{student.name}</h1><p className="lede">@{student.username} · {student.email}</p><p>{student.completed} completed work · Overall accuracy: {accuracy(student.correct,student.graded)} ({student.correct}/{student.graded})</p></div></header>
    {user.role==='admin'&&<StudentAccountManager key={`${student.id}-${Boolean(student.disabled_at)}`} studentId={student.id} disabled={Boolean(student.disabled_at)} duplicateOf={student.duplicate_of_id} accounts={students.filter(s=>!s.disabled_at&&!s.duplicate_of_id&&s.approval_status==='active')} />}
    {linked.length>0&&<section className="panel answer-editor"><h2>Linked duplicate accounts</h2><p>Open each account to review the work submitted under it.</p><ul>{linked.map(s=><li key={s.id}><Link href={`/admin/students/${s.id}`}>{s.name} (@{s.username})</Link></li>)}</ul></section>}
    <AssignmentHistory items={(await studentHistory(studentId,user)).filter(item=>item.status==='submitted')} studentId={studentId} completedOnly />
  </Workspace>;
}
