import Link from 'next/link';
import { notFound } from 'next/navigation';
import AssignmentViewer from '@/components/assignment-viewer';
import { requireAppUser } from '@/lib/app-user';
import { getAssignment } from '@/lib/assignments';
export const dynamic='force-dynamic';
export default async function StudentAssignmentPage({params}:{params:Promise<{assignmentId:string}>}) {
  const user=await requireAppUser();
  const assignment=await getAssignment(user,(await params).assignmentId);
  if(!assignment) notFound();
  return <main className="student-main"><p><Link href="/student">← My assignments</Link></p><AssignmentViewer assignment={assignment} /></main>;
}
