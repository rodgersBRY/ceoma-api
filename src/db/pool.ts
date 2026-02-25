import { readFileSync } from "node:fs";

import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

import { logger } from "../common/logger.js";
import { env } from "../config/env.js";

const ssl =
  env.dbSslMode === "require"
    ? {
        rejectUnauthorized: env.dbSslRejectUnauthorized,
        ca: env.dbSslCaPath ? readFileSync(env.dbSslCaPath, "utf-8") : undefined,
      }
    : undefined;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // ssl,
});

let poolEventsRegistered = false;

export function registerPoolEventLogging(): void {
  if (poolEventsRegistered) {
    return;
  }
  poolEventsRegistered = true;

  pool.on("connect", () => {
    logger.info("Database pool established a new client connection");
  });

  pool.on("acquire", () => {
    logger.debug("Database client acquired from pool");
  });

  pool.on("remove", () => {
    logger.warn("Database client removed from pool");
  });

  pool.on("error", (error) => {
    logger.error("Unexpected database pool error", { error });
  });
}

export async function verifyDatabaseConnection(): Promise<void> {
  try {
    const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
    logger.info("Database connection check succeeded", {
      host: new URL(env.databaseUrl).hostname,
      database: new URL(env.databaseUrl).pathname.replace("/", ""),
      ok: result.rows[0]?.ok === 1,
    });
  } catch (error) {
    logger.error("Database connection check failed", { error });
    throw error;
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
