import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * DATABASE_URL:
 *   postgres://user:pass@host:5432/db  -> real PostgreSQL (production)
 *   pglite:./.data/pg                  -> embedded PostgreSQL (WASM) for local dev without installing Postgres
 */
async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    return drizzle(new PGlite(url.slice("pglite:".length)), { schema }) as unknown as DB;
  }
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  return drizzle(postgres(url, { max: 10, prepare: false }), { schema }) as unknown as DB;
}

// One connection pool per server process (survives dev hot reloads).
const g = globalThis as unknown as { __grtDb?: Promise<DB> };
export function getDb(): Promise<DB> {
  g.__grtDb ??= connect();
  return g.__grtDb;
}

export { schema };
