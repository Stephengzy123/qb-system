import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getBrandingStorage } from "@/lib/branding-storage";

export async function storeVerifiedImage(key: string, body: Buffer, contentType: string) {
  const storage = getBrandingStorage();
  if (!storage) throw new Error("Question image storage is not configured.");
  const checksum = createHash("sha256").update(body).digest("hex");
  await storage.client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: key, Body: body, ContentType: contentType }));
  // Read the stored bytes back: a successful PUT alone is not a verified import.
  const stored = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key }));
  const bytes = await stored.Body?.transformToByteArray();
  if (!bytes || bytes.length !== body.length || createHash("sha256").update(bytes).digest("hex") !== checksum) throw new Error("The image could not be verified in R2. Retry this file.");
  return checksum;
}
