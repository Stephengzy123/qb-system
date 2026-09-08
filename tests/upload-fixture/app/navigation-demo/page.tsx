import Workspace from '../../../../src/components/workspace';
export default async function Page({searchParams}:{searchParams:Promise<{role?:string}>}){return <Workspace view="students" user={{displayName:'Test',role:(await searchParams).role??'admin'}} organizationName="School"><h1>Navigation test</h1></Workspace>;}
