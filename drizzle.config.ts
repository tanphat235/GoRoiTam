import { defineConfig } from "drizzle-kit";

// Only used to GENERATE SQL migrations from src/server/db/schema.ts (`npm run db:generate`).
// Applying them is done by scripts/migrate.mjs, which supports both Postgres and PGlite.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});
