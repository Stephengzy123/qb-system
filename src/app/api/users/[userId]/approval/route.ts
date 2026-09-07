import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const actor = await getAppUser();
  if (!actor || actor.status !== "active" || actor.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { userId } = await params;
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (body?.status !== "active" && body?.status !== "rejected") return NextResponse.json({ error: "Invalid decision." }, { status: 400 });

  const database = getDatabase();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE users SET approval_status = $1::account_status, approved_by = $2, approved_at = CASE WHEN $1::account_status = 'active'::account_status THEN now() ELSE NULL END, updated_at = now() WHERE id = $3 AND approval_status = 'pending' RETURNING id", [body.status, actor.id, userId]);
    if (!result.rowCount) {
      const existing = await client.query<{ approval_status: string }>("SELECT approval_status FROM users WHERE id = $1", [userId]);
      await client.query("ROLLBACK");
      if (existing.rowCount) return NextResponse.json({ status: existing.rows[0].approval_status, alreadyResolved: true });
      return NextResponse.json({ error: "Account does not exist." }, { status: 404 });
    }
    await client.query("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, $2, 'user', $3)", [actor.id, `account_${body.status}`, userId]);
    await client.query("COMMIT");
    return NextResponse.json({ status: body.status });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "The account decision could not be saved." }, { status: 500 });
  } finally {
    client.release();
  }
}
