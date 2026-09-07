import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string; membershipId: string }> }) {
  const user = await getAppUser();
  if (!user || user.status !== "active" || user.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { classId, membershipId } = await params;
  const database = getDatabase();
  if (user.role !== "admin") {
    const permitted = await database.query("SELECT 1 FROM class_memberships WHERE class_id = $1 AND user_id = $2 AND role = 'teacher' AND status = 'active'", [classId, user.id]);
    if (!permitted.rowCount) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (body?.status !== "active" && body?.status !== "rejected") return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const result = await database.query<{ status: string }>("UPDATE class_memberships SET status = $1, resolved_at = now(), resolved_by = $2 WHERE id = $3 AND class_id = $4 AND role = 'student' AND status = 'pending' RETURNING status", [body.status, user.id, membershipId, classId]);
  if (!result.rowCount) {
    const existing = await database.query<{ status: string }>("SELECT status FROM class_memberships WHERE id = $1 AND class_id = $2 AND role = 'student'", [membershipId, classId]);
    if (existing.rowCount) return NextResponse.json({ status: existing.rows[0].status, alreadyResolved: true });
    return NextResponse.json({ error: "Enrollment request does not exist." }, { status: 404 });
  }
  await database.query("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, 'class_membership', $3, jsonb_build_object('class_id', $4))", [user.id, `enrollment_${body.status}`, membershipId, classId]);
  return NextResponse.json({ status: body.status });
}
