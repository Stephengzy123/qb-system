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
  return <Workspace view="assignments" user={user} organizationName={await getOrganizationName()}><p><Link href="/admin/assignments">← Assignments</Link></p><AssignmentViewer assignment={assignment} /></Workspace>;
}
