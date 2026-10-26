import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/server/db";
import { newToken, sha256 } from "@/server/crypto";
import { createSession, destroyAllSessions } from "./session";
import { consumeToken, issueToken } from "./tokens";

/** Stored instead of a password hash when nobody may log in with a password yet. Never verifies. */
export const NO_PASSWORD = "!unset";

export const PENDING_EMAIL_COOKIE = "grt_pending_email";
export const SIGNUP_NONCE_COOKIE = "grt_signup_nonce";

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** Promotes accounts listed in ADMIN_EMAILS (production bootstrap of the first admin). Only ever called for verified emails. */
export async function syncAdmin(userId: string, email: string) {
  if (!adminEmails().includes(email.toLowerCase())) return;
  const db = await getDb();
  await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, userId));
}

/** Browser-bound secret for this signup. Returns its hash, which is stored with the verification token. */
export async function newSignupNonce() {
  const nonce = newToken();
  (await cookies()).set(SIGNUP_NONCE_COOKIE, nonce, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 24 * 3600, path: "/",
  });
  return sha256(nonce);
}

export type VerifyResult =
  | { ok: false }
  | { ok: true; next: "/choose-nickname" }
  | { ok: true; next: `/reset-password?token=${string}` };

/**
 * Email verification. The password chosen at signup is applied ONLY when the link is opened in the
 * browser that signed up (nonce cookie matches). Otherwise the mailbox owner must set a new password,
 * so a password planted by someone who pre-registered this email can never become active.
 */
export async function verifyEmailToken(token: string): Promise<VerifyResult> {
  const row = await consumeToken(token, "verify");
  if (!row) return { ok: false };
  const jar = await cookies();
  const nonce = jar.get(SIGNUP_NONCE_COOKIE)?.value;
  const sameBrowser = Boolean(row.passwordHash && row.nonceHash && nonce && sha256(nonce) === row.nonceHash);

  const db = await getDb();
  const [user] = await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date(), passwordHash: sameBrowser ? row.passwordHash! : NO_PASSWORD })
    .where(eq(schema.users.id, row.userId))
    .returning({ id: schema.users.id, email: schema.users.email });
  await destroyAllSessions(user.id);
  await syncAdmin(user.id, user.email);
  jar.delete(PENDING_EMAIL_COOKIE);
  jar.delete(SIGNUP_NONCE_COOKIE);

  if (sameBrowser) {
    await createSession(user.id);
    return { ok: true, next: "/choose-nickname" };
  }
  // Email ownership is now proven; let the person holding the mailbox choose the password.
  const reset = await issueToken(user.id, "reset");
  return { ok: true, next: `/reset-password?token=${reset}` };
}

const RESERVED = ["admin", "administrator", "moderator", "quan tri", "quản trị", "kiểm duyệt", "ẩn danh", "an danh", "gỡ rối tâm", "go roi tam", "system", "hệ thống"];

/** Case-insensitive uniqueness plus reserved names, so nobody can pose as staff or as "Ẩn danh". */
export async function nicknameProblem(nickname: string, exceptUserId?: string) {
  const lower = nickname.toLowerCase();
  if (RESERVED.some((r) => lower === r || lower.startsWith(`${r} `) || lower.endsWith(` ${r}`))) return "Biệt danh này được dành riêng, hãy chọn tên khác.";
  const db = await getDb();
  const u = schema.users;
  const [taken] = await db.select({ id: u.id }).from(u)
    .where(and(sql`lower(${u.nickname}) = ${lower}`, exceptUserId ? ne(u.id, exceptUserId) : undefined));
  return taken ? "Biệt danh này đã có người dùng." : null;
}
