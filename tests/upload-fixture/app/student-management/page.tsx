import {cookies} from 'next/headers';
import StudentDirectory from '../../../../src/components/student-directory';
import StudentAccountManager from '../../../../src/components/student-account-manager';
import {learningId} from '../../learning-data';
export default async function Page(){
  const disabled=(await cookies()).get('test-disabled')?.value==='yes';
  const student={id:learningId(50),name:'Alex',username:'alex2',email:'alex2@example.test',approval_status:'active',duplicate_of_id:disabled?learningId(51):null,disabled_at:disabled?'2026-09-08':null,completed:1,correct:1,graded:2};
  return <><StudentDirectory students={[student]} /><StudentAccountManager key={String(disabled)} studentId={student.id} disabled={disabled} duplicateOf={student.duplicate_of_id} accounts={[{id:learningId(51),name:'Alex primary',username:'alex'}]} /></>;
}
