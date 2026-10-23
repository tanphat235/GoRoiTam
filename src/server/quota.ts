import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";

export const LIMITS = {
  free: { ai: 2, post: 2 },
  premium: { ai: 30, post: 10 },
} as const;

export type QuotaKind = "ai" | "post";
const utcDay = () => new Date().toISOString().slice(0, 10);

/**
 * Atomic check-and-increment: the UPDATE only matches while under the limit, so parallel
 * requests cannot exceed it (no read-then-write race).
 */
export async function consumeQuota(userId: string, plan: keyof typeof LIMITS, kind: QuotaKind) {
  const db = await getDb();
  const u = schema.usageDaily;
  const col = kind === "ai" ? u.aiCount : u.postCount;
  const day = utcDay();
  await db.insert(u).values({ userId, day }).onConflictDoNothing();
  const rows = await db
    .update(u)
    .set(kind === "ai" ? { aiCount: sql`${u.aiCount} + 1` } : { postCount: sql`${u.postCount} + 1` })
    .where(and(eq(u.userId, userId), eq(u.day, day), sql`${col} < ${LIMITS[plan][kind]}`))
    .returning({ day: u.day });
  return rows.length === 1;
}

export async function refundQuota(userId: string, kind: QuotaKind) {
  const db = await getDb();
  const u = schema.usageDaily;
  await db
    .update(u)
    .set(kind === "ai" ? { aiCount: sql`greatest(${u.aiCount} - 1, 0)` } : { postCount: sql`greatest(${u.postCount} - 1, 0)` })
    .where(and(eq(u.userId, userId), eq(u.day, utcDay())));
}

export async function usageToday(userId: string) {
  const db = await getDb();
  const u = schema.usageDaily;
  const [row] = await db.select({ ai: u.aiCount, post: u.postCount }).from(u).where(and(eq(u.userId, userId), eq(u.day, utcDay())));
  return row ?? { ai: 0, post: 0 };
}

export async function consumeGuestQuota(keyHash: string, limit: number) {
  const db = await getDb();
  const g = schema.guestUsage;
  const day = utcDay();
  await db.insert(g).values({ keyHash, day }).onConflictDoNothing();
  const rows = await db
    .update(g)
    .set({ aiCount: sql`${g.aiCount} + 1` })
    .where(and(eq(g.keyHash, keyHash), eq(g.day, day), sql`${g.aiCount} < ${limit}`))
    .returning({ day: g.day });
  return rows.length === 1;
}
