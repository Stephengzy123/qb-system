import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";

async function authorizeClassManager(classId: string) {
  const user = await getAppUser();
  if (!user || user.status !== "active" || user.role === "student") return null;
  const database = getDatabase();
  if (user.role !== "admin") {
    const permitted = await database.query("SELECT 1 FROM class_memberships WHERE class_id = $1 AND user_id = $2 AND role = 'teacher' AND status = 'active'", [classId, user.id]);
    if (!permitted.rowCount) return null;
  }
  return { user, database };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string; membershipId: string }> }) {
  const { classId, membershipId } = await params;
  const authorization = await authorizeClassManager(classId);
  if (!authorization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user, database } = authorization;
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (body?.status !== "active" && body?.status !== "rejected") return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ status: string }>("UPDATE class_memberships SET status = $1, resolved_at = now(), resolved_by = $2 WHERE id = $3 AND class_id = $4 AND role = 'student' AND status = 'pending' RETURNING status", [body.status, user.id, membershipId, classId]);
    if (!result.rowCount) {
      const existing = await client.query<{ status: string }>("SELECT status FROM class_memberships WHERE id = $1 AND class_id = $2 AND role = 'student'", [membershipId, classId]);
      await client.query("ROLLBACK");
      if (existing.rowCount) return NextResponse.json({ status: existing.rows[0].status, alreadyResolved: true });
      return NextResponse.json({ error: "Enrollment request does not exist." }, { status: 404 });
    }
    await client.query("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, 'class_membership', $3, jsonb_build_object('class_id', $4::text))", [user.id, `enrollment_${body.status}`, membershipId, classId]);
    await client.query("COMMIT");
    return NextResponse.json({ status: body.status });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to resolve enrollment request", error);
    return NextResponse.json({ error: "Unable to resolve this enrollment request." }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ classId: string; membershipId: string }> }) {
  const { classId, membershipId } = await params;
  const authorization = await authorizeClassManager(classId);
  if (!authorization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user, database } = authorization;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE class_memberships SET status = 'rejected', resolved_at = now(), resolved_by = $1 WHERE id = $2 AND class_id = $3 AND role = 'student' AND status = 'active' RETURNING id", [user.id, membershipId, classId]);
    if (!result.rowCount) {
      const existing = await client.query<{ status: string }>("SELECT status FROM class_memberships WHERE id = $1 AND class_id = $2 AND role = 'student'", [membershipId, classId]);
      await client.query("ROLLBACK");
      if (existing.rows[0]?.status === "rejected") return NextResponse.json({ status: "rejected", alreadyRemoved: true });
      if (existing.rowCount) return NextResponse.json({ error: "Only active students can be removed." }, { status: 409 });
      return NextResponse.json({ error: "Class member does not exist." }, { status: 404 });
    }
    await client.query("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1, 'class_member_removed', 'class_membership', $2, jsonb_build_object('class_id', $3::text))", [user.id, membershipId, classId]);
    await client.query("COMMIT");
    return NextResponse.json({ status: "rejected" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to remove class member", error);
    return NextResponse.json({ error: "Unable to remove this class member." }, { status: 500 });
  } finally {
    client.release();
  }
}
