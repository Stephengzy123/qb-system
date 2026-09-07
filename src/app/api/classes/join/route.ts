import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";
import { hashClassCode } from "@/lib/classes";

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user || user.status !== "active" || user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { code?: string } | null;
  if (!body?.code) return NextResponse.json({ error: "Enter a class code." }, { status: 400 });
  const database = getDatabase();
  const classResult = await database.query<{ id: string; name: string }>("SELECT id, name FROM classes WHERE class_code_hash = $1 AND class_code_revoked_at IS NULL AND archived_at IS NULL", [hashClassCode(body.code)]);
  if (!classResult.rowCount) return NextResponse.json({ error: "That class code is not valid." }, { status: 404 });
  const target = classResult.rows[0];
  const membership = await database.query<{ id: string; status: string; requested_at: Date }>(`INSERT INTO class_memberships (class_id, user_id, role, status)
    VALUES ($1, $2, 'student', 'pending')
    ON CONFLICT (class_id, user_id) DO UPDATE
      SET status = 'pending', requested_at = now(), resolved_at = NULL, resolved_by = NULL
      WHERE class_memberships.status = 'rejected'
    RETURNING id, status, requested_at`, [target.id, user.id]);
  const row = membership.rows[0] ?? (await database.query<{ id: string; status: string; requested_at: Date }>(
    "SELECT id, status, requested_at FROM class_memberships WHERE class_id = $1 AND user_id = $2",
    [target.id, user.id],
  )).rows[0];
  return NextResponse.json({ id: row.id, className: target.name, status: row.status, requestedAt: row.requested_at });
}
