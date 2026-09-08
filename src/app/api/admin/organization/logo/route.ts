import { randomUUID } from "node:crypto";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";
import { getBrandingStorage } from "@/lib/branding-storage";

const MAX_LOGO_BYTES = 512 * 1024;
const MAX_FAVICON_BYTES = 64 * 1024;

async function requireAdmin() {
  const actor = await getAppUser();
  return actor?.status === "active" && actor.role === "admin" ? actor : null;
}

async function hasValidSignature(file: File, maxBytes: number, type: "image/webp" | "image/png") {
  if (file.type !== type || file.size < 12 || file.size > maxBytes) return false;
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (type === "image/png") return header.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  return new TextDecoder().decode(header.slice(0, 4)) === "RIFF" && new TextDecoder().decode(header.slice(8, 12)) === "WEBP";
}

export async function POST(request: Request) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const storage = getBrandingStorage();
  if (!storage) return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 700 * 1024) return NextResponse.json({ error: "The formatted upload is too large." }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const logo = form?.get("logo");
  const favicon = form?.get("favicon");
  if (!(logo instanceof File) || !(favicon instanceof File) || !(await hasValidSignature(logo, MAX_LOGO_BYTES, "image/webp")) || !(await hasValidSignature(favicon, MAX_FAVICON_BYTES, "image/png"))) {
    return NextResponse.json({ error: "The formatted branding images are invalid or too large." }, { status: 400 });
  }

  const id = randomUUID();
  const logoKey = `branding/${id}/logo.webp`;
  const faviconKey = `branding/${id}/favicon.png`;
  const database = getDatabase();
  const client = await database.connect();
  let oldKeys: string[] = [];

  try {
    await client.query("BEGIN");
    const previous = await client.query<{ logo_storage_key: string | null; favicon_storage_key: string | null }>(
      "SELECT logo_storage_key, favicon_storage_key FROM organization_settings WHERE singleton = true FOR UPDATE",
    );
    await Promise.all([
      storage.client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: logoKey, Body: Buffer.from(await logo.arrayBuffer()), ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" })),
      storage.client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: faviconKey, Body: Buffer.from(await favicon.arrayBuffer()), ContentType: "image/png", CacheControl: "public, max-age=31536000, immutable" })),
    ]);
    await client.query(
      `UPDATE organization_settings SET logo_storage_key = $1, favicon_storage_key = $2,
         logo_mime_type = 'image/webp', logo_byte_size = $3, logo_updated_at = now(), updated_by = $4, updated_at = now()
       WHERE singleton = true`,
      [logoKey, faviconKey, logo.size, actor.id],
    );
    oldKeys = [previous.rows[0]?.logo_storage_key, previous.rows[0]?.favicon_storage_key].filter((key): key is string => Boolean(key));
    await client.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, metadata) VALUES ($1, 'organization_logo_updated', 'organization', jsonb_build_object('byte_size', $2::int))",
      [actor.id, logo.size],
    );
    await client.query("COMMIT");
    if (oldKeys.length) await storage.client.send(new DeleteObjectsCommand({ Bucket: storage.bucket, Delete: { Objects: oldKeys.map((Key) => ({ Key })) } })).catch(() => undefined);
    return NextResponse.json({ logoUrl: `/api/branding/logo?v=${Date.now()}` });
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    await storage.client.send(new DeleteObjectsCommand({ Bucket: storage.bucket, Delete: { Objects: [{ Key: logoKey }, { Key: faviconKey }] } })).catch(() => undefined);
    return NextResponse.json({ error: "The logo could not be saved." }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE() {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const database = getDatabase();
  const client = await database.connect();
  let keys: string[] = [];
  try {
    await client.query("BEGIN");
    const previous = await client.query<{ logo_storage_key: string | null; favicon_storage_key: string | null }>(
      "SELECT logo_storage_key, favicon_storage_key FROM organization_settings WHERE singleton = true FOR UPDATE",
    );
    keys = [previous.rows[0]?.logo_storage_key, previous.rows[0]?.favicon_storage_key].filter((key): key is string => Boolean(key));
    await client.query(
      `UPDATE organization_settings SET logo_storage_key = NULL, favicon_storage_key = NULL,
         logo_mime_type = NULL, logo_byte_size = NULL, logo_updated_at = now(), updated_by = $1, updated_at = now()
       WHERE singleton = true`,
      [actor.id],
    );
    await client.query("INSERT INTO audit_logs (actor_user_id, action, entity_type) VALUES ($1, 'organization_logo_removed', 'organization')", [actor.id]);
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    return NextResponse.json({ error: "The logo could not be removed." }, { status: 500 });
  } finally {
    client.release();
  }
  const storage = getBrandingStorage();
  if (storage && keys.length) await storage.client.send(new DeleteObjectsCommand({ Bucket: storage.bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } })).catch(() => undefined);
  return NextResponse.json({ logoUrl: `/api/branding/logo?v=${Date.now()}` });
}
