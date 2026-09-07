import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required to run database migrations.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 1 });
const client = await pool.connect();

try {
  await client.query("SELECT pg_advisory_lock(418206091)");
  await client.query(`CREATE TABLE IF NOT EXISTS app_migrations (
    name text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const directory = path.join(process.cwd(), "database");
  const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();

  for (const file of files) {
    const sql = await readFile(path.join(directory, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query("SELECT checksum FROM app_migrations WHERE name = $1", [file]);

    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration ${file} has changed.`);
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO app_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
      await client.query("COMMIT");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(418206091)").catch(() => undefined);
  client.release();
  await pool.end();
}
