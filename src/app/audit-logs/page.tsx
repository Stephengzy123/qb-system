import Link from "next/link";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const user = await requireAppUser({ staff: true });
  return <Workspace view="audit" user={user}>
    <header className="page-header compact"><div><p className="eyebrow">ADMINISTRATION</p><h1>Audit logs</h1><p className="lede">Review administrative activity and content imports.</p></div></header>
    <nav className="subnav" aria-label="Audit log sections"><Link className="active" href="/audit-logs">Activity</Link><Link href="/audit-logs/imports">Import history</Link></nav>
    <section className="panel"><div className="panel-heading"><div><h2>Activity</h2><p>Approvals, grading-key changes, publishing, and reopen actions</p></div></div><div className="empty-state"><span>⌁</span><h2>No audit events yet</h2><p>Administrative actions will appear here as they occur.</p></div></section>
  </Workspace>;
}
