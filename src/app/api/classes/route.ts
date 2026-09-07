import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";
import { generateClassCode, hashClassCode } from "@/lib/classes";

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user || user.status !== "active" || user.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name || name.length > 120) return NextResponse.json({ error: "Enter a valid class name." }, { status: 400 });

  const code = generateClassCode();
  const database = getDatabase();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query<{ id: string }>("INSERT INTO classes (name, class_code, class_code_hash, created_by) VALUES ($1, $2, $3, $4) RETURNING id", [name, code, hashClassCode(code), user.id]);
    await client.query("INSERT INTO class_memberships (class_id, user_id, role, status, resolved_at, resolved_by) VALUES ($1, $2, 'teacher', 'active', now(), $2)", [created.rows[0].id, user.id]);
    await client.query("COMMIT");
    return NextResponse.json({ id: created.rows[0].id, name, code }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "The class could not be created." }, { status: 500 });
  } finally { client.release(); }
}
