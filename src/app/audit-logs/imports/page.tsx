import Link from "next/link";
import Workspace from "@/components/workspace";
import { requireAppUser, getDatabase } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function ImportHistoryPage() {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  const imports = (await getDatabase().query<{id:string;source_name:string;status:string;succeeded_files:number;total_files:number;failed_files:number}>("SELECT id,source_name,status,succeeded_files,total_files,failed_files FROM imports WHERE $2::boolean OR created_by=$1 ORDER BY created_at DESC", [user.id,user.role==='admin'])).rows;
  return <Workspace view="audit" user={user} organizationName={organizationName}>
    <header className="page-header compact"><div><p className="eyebrow">ADMINISTRATION</p><h1>Audit logs</h1><p className="lede">Review administrative activity and content imports.</p></div><Link className="primary-button" href="/admin/question-bank/upload">Upload a set</Link></header>
    <nav className="subnav" aria-label="Audit log sections"><Link href="/admin/audit-logs">Activity</Link><Link className="active" href="/admin/audit-logs/imports">Import history</Link></nav>
    <section className="panel"><div className="panel-heading"><div><h2>Import history</h2><p>Completed uploads, validation results, and file-level failures</p></div></div>{imports.length ? imports.map(job => <article className="upload-history" key={job.id}><Link href={`/admin/question-bank/imports/${job.id}`}>{job.source_name}</Link><p>{job.succeeded_files}/{job.total_files} verified · {job.failed_files} failed · {job.status.replaceAll('_',' ')}</p></article>) : <div className="empty-state"><span>↑</span><h2>No imports yet</h2><p>Question-set upload events will appear here.</p></div>}</section>
  </Workspace>;
}
