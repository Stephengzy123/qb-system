import Link from 'next/link';
import { notFound } from 'next/navigation';
import Workspace from '@/components/workspace';
import StudentResult from '@/components/student-result';
import { requireAppUser } from '@/lib/app-user';
import { getOrganizationName } from '@/lib/organization';
import { getAssignment } from '@/lib/assignments';
import { getStudentResult } from '@/lib/learning';
export const dynamic='force-dynamic';
export default async function IndividualResultPage({params}:{params:Promise<{assignmentId:string;studentId:string}>}) {
  const user=await requireAppUser({staff:true});
  const {assignmentId,studentId}=await params;
  const result=await getStudentResult(user,assignmentId,studentId);
  if(!result)notFound();
  const assignment=await getAssignment(user,assignmentId);
  return <Workspace view="assignments" user={user} organizationName={await getOrganizationName()}><p><Link href={`/admin/students/${studentId}`}>← Student history</Link></p><header className="page-header"><div><p className="eyebrow">{assignment?.class_name}</p><h1>{assignment?.title??"Assignment results"}</h1></div></header><StudentResult result={result} assignmentId={assignmentId} /></Workspace>;
}
