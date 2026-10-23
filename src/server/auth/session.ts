import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema } from "@/server/db";
import { newToken, sha256 } from "@/server/crypto";

export const SESSION_COOKIE = "grt_session";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  nickname: string | null;
  bio: string | null;
  role: "user" | "moderator" | "admin";
  plan: "free" | "premium";
  timezone: string;
  emailVerified: boolean;
  createdAt: Date;
};

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = await getDb();
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  const db = await getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/** Resolved once per request. Banned users are treated as signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const db = await getDb();
  const u = schema.users;
  const [row] = await db
    .select({
      id: u.id, email: u.email, nickname: u.nickname, bio: u.bio, role: u.role, plan: u.plan,
      timezone: u.timezone, emailVerifiedAt: u.emailVerifiedAt, bannedAt: u.bannedAt, createdAt: u.createdAt,
    })
    .from(schema.sessions)
    .innerJoin(u, eq(u.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.bannedAt) return null;
  const { emailVerifiedAt, bannedAt: _banned, ...rest } = row;
  void _banned;
  return { ...rest, emailVerified: Boolean(emailVerifiedAt) };
});

/** Signed in, email verified and nickname chosen: the state required for every member feature. */
export async function requireMember(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (!user.emailVerified) redirect("/kiem-tra-email");
  if (!user.nickname) redirect("/chon-biet-danh");
  return user as CurrentUser & { nickname: string };
}

export async function requireStaff() {
  const user = await requireMember();
  if (user.role === "user") redirect("/");
  return user;
}
