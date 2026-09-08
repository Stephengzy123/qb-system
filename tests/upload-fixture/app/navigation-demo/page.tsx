import Link from 'next/link';
import Workspace from '../../../../src/components/workspace';
import AdminAppearance from '../../../../src/components/admin-appearance';
export default async function Page({searchParams}:{searchParams:Promise<{role?:string;settings?:string}>}){
  const params=await searchParams;const role=params.role??'admin';
  return <Workspace view="students" user={{displayName:'Test',role}} organizationName="School"><h1>Navigation test</h1><Link href={`/navigation-demo?role=${role}&settings=1`}>Test settings</Link><Link href={`/navigation-demo?role=${role}`}>Test overview</Link>{params.settings==='1'&&role==='admin'&&<AdminAppearance />}</Workspace>;
}
