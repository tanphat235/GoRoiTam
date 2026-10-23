import "server-only";
import { and, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { newToken, sha256 } from "@/server/crypto";

const TTL = { verify: 24 * 3600_000, reset: 3600_000 } as const;
type Purpose = keyof typeof TTL;
export type SignupBinding = { passwordHash: string; nonceHash: string };

/** Issues a single-use token; older unused tokens of the same purpose are invalidated. */
export async function issueToken(userId: string, purpose: Purpose, binding?: SignupBinding) {
  const db = await getDb();
  const t = schema.emailTokens;
  await db.update(t).set({ usedAt: new Date() }).where(and(eq(t.userId, userId), eq(t.purpose, purpose), isNull(t.usedAt)));
  const token = newToken();
  await db.insert(t).values({
    id: sha256(token), userId, purpose, expiresAt: new Date(Date.now() + TTL[purpose]),
    passwordHash: binding?.passwordHash ?? null, nonceHash: binding?.nonceHash ?? null,
  });
  return token;
}

/** Atomically marks the token used. Returns its user and signup binding, or null when invalid/expired/used. */
export async function consumeToken(token: string, purpose: Purpose) {
  const db = await getDb();
  const t = schema.emailTokens;
  const [row] = await db
    .update(t)
    .set({ usedAt: new Date() })
    .where(and(eq(t.id, sha256(token)), eq(t.purpose, purpose), isNull(t.usedAt), gt(t.expiresAt, new Date())))
    .returning({ userId: t.userId, passwordHash: t.passwordHash, nonceHash: t.nonceHash });
  return row ?? null;
}

/** Binding of the most recent signup for this user (used to resend the link and to check an unverified login). */
export async function latestSignupBinding(userId: string): Promise<SignupBinding | null> {
  const db = await getDb();
  const t = schema.emailTokens;
  const [row] = await db
    .select({ passwordHash: t.passwordHash, nonceHash: t.nonceHash })
    .from(t)
    .where(and(eq(t.userId, userId), eq(t.purpose, "verify"), isNotNull(t.passwordHash), isNotNull(t.nonceHash)))
    .orderBy(desc(t.expiresAt))
    .limit(1);
  return row?.passwordHash && row.nonceHash ? { passwordHash: row.passwordHash, nonceHash: row.nonceHash } : null;
}
