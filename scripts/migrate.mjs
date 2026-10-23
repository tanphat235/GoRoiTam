// Applies SQL migrations in ./drizzle to DATABASE_URL (Postgres or pglite:<dir>).
//   node --env-file=.env.local scripts/migrate.mjs
import { mkdirSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (see .env.example)");
  process.exit(1);
}
const migrationsFolder = "./drizzle";

if (url.startsWith("pglite:")) {
  const dir = url.slice("pglite:".length);
  mkdirSync(dir, { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(dir);
  await migrate(drizzle(client), { migrationsFolder });
  await client.close();
} else {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder });
  await client.end();
}
console.log("Migrations applied.");
