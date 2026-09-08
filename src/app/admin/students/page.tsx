import {notFound} from 'next/navigation';
import Workspace from '@/components/workspace';
import StudentDirectory from '@/components/student-directory';
import {requireAppUser} from '@/lib/app-user';
import {getOrganizationName} from '@/lib/organization';
import {listStudents} from '@/lib/students';
export const dynamic='force-dynamic';
export default async function StudentsPage(){
  const user=await requireAppUser({staff:true});if(user.role!=='admin')notFound();
  const students=await listStudents();
  return <Workspace view="students" user={user} organizationName={await getOrganizationName()}><header className="page-header"><div><p className="eyebrow">ADMINISTRATION</p><h1>Students</h1><p className="lede">Manage student accounts and review assignment history and accuracy.</p></div></header><StudentDirectory students={students.map(s=>({...s,disabled_at:s.disabled_at?.toISOString()??null}))} /></Workspace>;
}
