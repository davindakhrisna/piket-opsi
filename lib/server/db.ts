import { Pool, type PoolClient } from "pg";

const globalDb = globalThis as typeof globalThis & { piketPool?: Pool };
export function connectionString() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  const url = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    url.searchParams.set("sslmode", "verify-full");
    url.searchParams.delete("uselibpqcompat");
  }
  return url.toString();
}

export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!globalDb.piketPool) {
    globalDb.piketPool = new Pool({
      connectionString: connectionString(),
      max: 3,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
      statement_timeout: 15000,
      application_name: "piket-opsi",
    });
    globalDb.piketPool.on("error", () =>
      console.error(
        "Idle database connection failed; requests will reconnect.",
      ),
    );
  }
  return globalDb.piketPool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
