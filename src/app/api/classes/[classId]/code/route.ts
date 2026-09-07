import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";
import { generateClassCode, hashClassCode } from "@/lib/classes";

export async function POST(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const user = await getAppUser();
  if (!user || user.status !== "active" || user.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { classId } = await params;
  const database = getDatabase();
  if (user.role !== "admin") {
    const permitted = await database.query("SELECT 1 FROM class_memberships WHERE class_id = $1 AND user_id = $2 AND role = 'teacher' AND status = 'active'", [classId, user.id]);
    if (!permitted.rowCount) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const code = generateClassCode();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query("UPDATE classes SET class_code = $1, class_code_hash = $2, class_code_rotated_at = now(), class_code_revoked_at = NULL, updated_at = now() WHERE id = $3 AND archived_at IS NULL RETURNING id", [code, hashClassCode(code), classId]);
    if (!updated.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Class not found." }, { status: 404 }); }
    await client.query("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, 'class_code_rotated', 'class', $2)", [user.id, classId]);
    await client.query("COMMIT");
    return NextResponse.json({ code });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "The class code could not be generated." }, { status: 500 });
  } finally {
    client.release();
  }
}
