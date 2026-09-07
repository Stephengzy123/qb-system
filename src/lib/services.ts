import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Pool } from "pg";

let pool: Pool | undefined;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

export async function checkDatabase() {
  const database = getPool();
  if (!database) return { configured: false, connected: false };

  try {
    await database.query("SELECT 1");
    return { configured: true, connected: true };
  } catch {
    return { configured: true, connected: false };
  }
}

export async function checkR2() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return { configured: false, connected: false };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { configured: true, connected: true };
  } catch {
    return { configured: true, connected: false };
  }
}
