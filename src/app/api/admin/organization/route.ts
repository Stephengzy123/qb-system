import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";

export async function PATCH(request: Request) {
  const actor = await getAppUser();
  if (!actor || actor.status !== "active" || actor.role !== "admin") {
    return NextResponse.json({ error: "Only administrators can rename the organization." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Enter an organization name between 1 and 120 characters." }, { status: 400 });
  }

  const database = getDatabase();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const previous = await client.query<{ name: string }>(
      "SELECT name FROM organization_settings WHERE singleton = true FOR UPDATE",
    );
    await client.query(
      `INSERT INTO organization_settings (singleton, name, updated_by, updated_at)
       VALUES (true, $1, $2, now())
       ON CONFLICT (singleton) DO UPDATE
       SET name = EXCLUDED.name, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [name, actor.id],
    );
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, metadata)
       VALUES ($1, 'organization_renamed', 'organization', jsonb_build_object('old_name', $2::text, 'new_name', $3::text))`,
      [actor.id, previous.rows[0]?.name ?? null, name],
    );
    await client.query("COMMIT");
    return NextResponse.json({ name });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "The organization name could not be saved." }, { status: 500 });
  } finally {
    client.release();
  }
}
