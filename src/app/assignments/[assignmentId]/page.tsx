import CloseAssignment from '@/components/close-assignment';
import ClassResults from '@/components/class-results';
import { getClassResults } from '@/lib/learning';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Workspace from '@/components/workspace';
import AssignmentViewer from '@/components/assignment-viewer';
import { requireAppUser } from '@/lib/app-user';
import { getOrganizationName } from '@/lib/organization';
import { getAssignment } from '@/lib/assignments';
export const dynamic='force-dynamic';
export default async function AssignmentPage({params}:{params:Promise<{assignmentId:string}>}) {
  const user=await requireAppUser({staff:true});
  const assignment=await getAssignment(user,(await params).assignmentId);
  if(!assignment) notFound();
  const results=await getClassResults(user,assignment.id);
  return <Workspace view="assignments" user={user} organizationName={await getOrganizationName()}><p><Link href="/admin/assignments">← Assignments</Link></p><header className="page-header"><div><p className="eyebrow">{assignment.class_name}</p><h1>{assignment.title}</h1></div></header>{!assignment.practice_student_id && assignment.status==='open' && !assignment.due_at && <CloseAssignment id={assignment.id} />}{assignment.status==='closed'&&<p role="status">This assignment is closed.</p>}{results&&<ClassResults assignmentId={assignment.id} {...results} />}<details className="assignment-question-preview"><summary>View assigned questions</summary><AssignmentViewer assignment={assignment} /></details></Workspace>;
}
