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

/**
 * Client IP as seen by our own reverse proxy. X-Forwarded-For is a list the client can pre-fill,
 * so the LEFT entries are attacker-controlled; only the entry appended by the proxy we run is
 * trustworthy. TRUSTED_PROXY_HOPS = number of our proxies in front of the app (default 1, e.g. Nginx).
 */
export function clientIpFrom(h: { get(name: string): string | null }) {
  const hops = Math.max(Number(process.env.TRUSTED_PROXY_HOPS ?? 1), 0);
  const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (hops > 0 && chain.length >= hops) return chain[chain.length - hops];
  return h.get("x-real-ip") || "unknown";
}

export async function clientIp() {
  return clientIpFrom(await headers());
}
