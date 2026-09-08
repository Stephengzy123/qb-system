import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/app-user";
import { getBrandingStorage } from "@/lib/branding-storage";

export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (asset !== "logo" && asset !== "favicon") return new NextResponse(null, { status: 404 });

  const column = asset === "logo" ? "logo_storage_key" : "favicon_storage_key";
  const result = await getDatabase().query<{ storage_key: string | null; updated_at: Date | null }>(
    `SELECT ${column} AS storage_key, logo_updated_at AS updated_at FROM organization_settings WHERE singleton = true`,
  );
  const key = result.rows[0]?.storage_key;
  const storage = getBrandingStorage();
  if (!key || !storage) return NextResponse.redirect(new URL("/icon.svg", request.url));

  try {
    const object = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key }));
    if (!object.Body) throw new Error("Empty branding object");
    const bytes = await object.Body.transformToByteArray();
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": object.ContentType ?? "image/webp",
        "Cache-Control": "public, max-age=0, must-revalidate",
        ETag: object.ETag ?? `"${result.rows[0]?.updated_at?.getTime() ?? 0}"`,
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/icon.svg", request.url));
  }
}
