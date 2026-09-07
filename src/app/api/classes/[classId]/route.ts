import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";

async function canManage(classId: string, userId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const result = await getDatabase().query("SELECT 1 FROM class_memberships WHERE class_id = $1 AND user_id = $2 AND role = 'teacher' AND status = 'active'", [classId, userId]);
  return Boolean(result.rowCount);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const user = await getAppUser();
  if (!user || user.status !== "active" || user.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { classId } = await params;
  if (!await canManage(classId, user.id, user.role === "admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name || name.length > 120) return NextResponse.json({ error: "Enter a valid class name." }, { status: 400 });

  const database = getDatabase();
  const result = await database.query("UPDATE classes SET name = $1, updated_at = now() WHERE id = $2 AND archived_at IS NULL RETURNING id", [name, classId]);
  if (!result.rowCount) return NextResponse.json({ error: "Class not found." }, { status: 404 });
  await database.query("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1, 'class_renamed', 'class', $2, jsonb_build_object('name', $3::text))", [user.id, classId, name]);
  return NextResponse.json({ name });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const user = await getAppUser();
  if (!user || user.status !== "active" || user.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { classId } = await params;
  if (!await canManage(classId, user.id, user.role === "admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const database = getDatabase();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE classes SET archived_at = now(), class_code_revoked_at = now(), updated_at = now() WHERE id = $1 AND archived_at IS NULL RETURNING id", [classId]);
    if (!result.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Class not found." }, { status: 404 }); }
    await client.query("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, 'class_archived', 'class', $2)", [user.id, classId]);
    await client.query("COMMIT");
    return NextResponse.json({ deleted: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "The class could not be deleted." }, { status: 500 });
  } finally {
    client.release();
  }
}
