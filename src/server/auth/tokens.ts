import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { newToken, sha256 } from "@/server/crypto";

const TTL = { verify: 24 * 3600_000, reset: 3600_000 } as const;
type Purpose = keyof typeof TTL;

/** Issues a single-use token; older unused tokens of the same purpose are invalidated. */
export async function issueToken(userId: string, purpose: Purpose) {
  const db = await getDb();
  const t = schema.emailTokens;
  await db.update(t).set({ usedAt: new Date() }).where(and(eq(t.userId, userId), eq(t.purpose, purpose), isNull(t.usedAt)));
  const token = newToken();
  await db.insert(t).values({ id: sha256(token), userId, purpose, expiresAt: new Date(Date.now() + TTL[purpose]) });
  return token;
}

/** Atomically marks the token used and returns its user id, or null when invalid/expired/used. */
export async function consumeToken(token: string, purpose: Purpose) {
  const db = await getDb();
  const t = schema.emailTokens;
  const [row] = await db
    .update(t)
    .set({ usedAt: new Date() })
    .where(and(eq(t.id, sha256(token)), eq(t.purpose, purpose), isNull(t.usedAt), gt(t.expiresAt, new Date())))
    .returning({ userId: t.userId });
  return row?.userId ?? null;
}
