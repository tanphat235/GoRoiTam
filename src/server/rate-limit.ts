import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, schema } from "@/server/db";
import { sha256 } from "@/server/crypto";

/** Fixed-window limiter stored in Postgres (no Redis needed). Returns true when the call is allowed. */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const db = await getDb();
  const r = schema.rateLimits;
  const [row] = await db
    .insert(r)
    .values({ key: sha256(key), windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: r.key,
      set: {
        count: sql`case when ${r.windowStart} < now() - make_interval(secs => ${windowSec}) then 1 else ${r.count} + 1 end`,
        windowStart: sql`case when ${r.windowStart} < now() - make_interval(secs => ${windowSec}) then now() else ${r.windowStart} end`,
      },
    })
    .returning({ count: r.count });
  return (row?.count ?? 0) <= limit;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
