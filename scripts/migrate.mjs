import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
import { connectionString } from "../lib/server/db.ts";
import { hashPassword } from "../lib/server/security.ts";

for (const name of [".env.local", ".env"])
  if (existsSync(name)) process.loadEnvFile(name);
if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL first.");
const client = new pg.Client({ connectionString: connectionString() });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(713421)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of readdirSync("db")
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(`db/${name}`, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query(
      "SELECT checksum FROM schema_migrations WHERE name = $1",
      [name],
    );
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum)
        throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations(name, checksum) VALUES ($1, $2)",
      [name, checksum],
    );
    console.log(`Applied ${name}`);
  }
  await client.query(
    "INSERT INTO users(id, name, email, role, password_hash) VALUES ('admin', 'Admin', 'admin', 'admin', $1) ON CONFLICT (id) DO NOTHING",
    [await hashPassword("admin")],
  );
  await client.query("COMMIT");
  console.log(
    "Database ready. Existing accounts and passwords were preserved.",
  );
} catch {
  await client.query("ROLLBACK").catch(() => {});
  // Connection errors can contain credentials: never print them.
  console.error(
    "Migration failed. Check connectivity, permissions, and migration checksums.",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
