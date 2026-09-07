import Link from "next/link";
import Workspace from "@/components/workspace";
import { getDatabase, requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

type AuditEvent = {
  id: string;
  action: string;
  entity_type: string;
  created_at: Date;
  actor_name: string | null;
  actor_username: string | null;
  subject_name: string | null;
  class_name: string | null;
};

const actionLabels: Record<string, string> = {
  account_active: "Approved account",
  account_rejected: "Rejected account",
  enrollment_active: "Approved enrollment",
  enrollment_rejected: "Rejected enrollment",
  class_member_removed: "Removed class member",
  class_renamed: "Renamed class",
  class_archived: "Deleted class",
  class_code_rotated: "Rotated class code",
};

function describeEvent(event: AuditEvent) {
  const subject = event.subject_name ? ` for ${event.subject_name}` : "";
  const className = event.class_name ? ` in ${event.class_name}` : "";
  return `${actionLabels[event.action] ?? event.action.replaceAll("_", " ")}${subject}${className}`;
}

export default async function AuditLogsPage() {
  const user = await requireAppUser({ staff: true });
  const database = getDatabase();
  const visibility = user.role === "admin" ? "" : `AND (
    a.actor_user_id = $1
    OR (a.entity_type = 'class' AND EXISTS (
      SELECT 1 FROM class_memberships mine WHERE mine.class_id = a.entity_id AND mine.user_id = $1 AND mine.role = 'teacher' AND mine.status = 'active'
    ))
    OR (a.entity_type = 'class_membership' AND EXISTS (
      SELECT 1 FROM class_memberships mine WHERE mine.class_id::text = a.metadata->>'class_id' AND mine.user_id = $1 AND mine.role = 'teacher' AND mine.status = 'active'
    ))
  )`;
  const events = await database.query<AuditEvent>(`SELECT a.id, a.action, a.entity_type, a.created_at,
    actor.display_name AS actor_name, actor.username AS actor_username,
    COALESCE(member_user.display_name, account_user.display_name) AS subject_name,
    target_class.name AS class_name
    FROM audit_logs a
    LEFT JOIN users actor ON actor.id = a.actor_user_id
    LEFT JOIN class_memberships target_membership ON a.entity_type = 'class_membership' AND target_membership.id = a.entity_id
    LEFT JOIN users member_user ON member_user.id = target_membership.user_id
    LEFT JOIN users account_user ON a.entity_type = 'user' AND account_user.id = a.entity_id
    LEFT JOIN classes target_class ON target_class.id = CASE
      WHEN a.entity_type = 'class' THEN a.entity_id
      WHEN a.entity_type = 'class_membership' THEN target_membership.class_id
      ELSE NULL
    END
    WHERE 1 = 1 ${visibility}
    ORDER BY a.created_at DESC
    LIMIT 200`, user.role === "admin" ? [] : [user.id]);
  return <Workspace view="audit" user={user}>
    <header className="page-header compact"><div><p className="eyebrow">ADMINISTRATION</p><h1>Audit logs</h1><p className="lede">Review administrative activity and content imports.</p></div></header>
    <nav className="subnav" aria-label="Audit log sections"><Link className="active" href="/audit-logs">Activity</Link><Link href="/audit-logs/imports">Import history</Link></nav>
    <section className="panel audit-panel"><div className="panel-heading"><div><h2>Activity</h2><p>Approvals, class changes, publishing, and reopen actions</p></div><b className="nav-badge">{events.rowCount ?? 0}</b></div>{events.rowCount === 0 ? <div className="empty-state"><span>⌁</span><h2>No audit events yet</h2><p>Administrative actions will appear here as they occur.</p></div> : <div className="audit-list">{events.rows.map((event) => <article className="audit-row" key={event.id}><span className="audit-icon">⌁</span><div><strong>{describeEvent(event)}</strong><small>By {event.actor_name ?? "System"}{event.actor_username ? ` (@${event.actor_username})` : ""}</small></div><time dateTime={new Date(event.created_at).toISOString()}>{new Date(event.created_at).toLocaleString()}</time></article>)}</div>}</section>
  </Workspace>;
}
