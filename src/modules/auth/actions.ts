"use server";

import { and, eq, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { NO_PASSWORD, PENDING_EMAIL_COOKIE, newSignupNonce, nicknameProblem, syncAdmin } from "@/server/auth/account";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroyAllSessions, destroySession, getCurrentUser, requireMember } from "@/server/auth/session";
import { consumeToken, issueToken, latestSignupBinding, type SignupBinding } from "@/server/auth/tokens";
import { getDb, schema } from "@/server/db";
import { sendMail } from "@/server/mail";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { safeNext, siteUrl } from "./redirect";

const Email = z.string().trim().toLowerCase().email().max(254);
const Password = z.string().min(8, "Mật khẩu tối thiểu 8 ký tự.").max(128);
const Nickname = z.string().trim().min(3).max(24).regex(/^[\p{L}\p{N}_ .-]+$/u);

const fail = (path: string, msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

async function rememberPending(email: string) {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600, path: "/",
  });
}

async function sendVerification(userId: string, email: string, binding?: SignupBinding) {
  const token = await issueToken(userId, "verify", binding);
  const link = `${siteUrl(await headers())}/verify-email?token=${token}`;
  await sendMail(email, "Xác nhận email · Gỡ Rối Tâm", "Chào mừng bạn đến với Gỡ Rối Tâm",
    "Bấm nút bên dưới để xác nhận email và bắt đầu hành trình. Liên kết có hiệu lực trong 24 giờ.",
    { href: link, label: "Xác nhận email" });
}

// ---------------- sign up ----------------

export async function signUp(formData: FormData) {
  const email = Email.safeParse(formData.get("email"));
  const password = Password.safeParse(formData.get("password"));
  if (!email.success) fail("/signup", "Email không hợp lệ.");
  if (!password.success) fail("/signup", "Mật khẩu tối thiểu 8 ký tự.");
  const tooFast = "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.";
  if (!(await rateLimit(`signup:ip:${await clientIp()}`, 5, 3600))) fail("/signup", tooFast);
  if (!(await rateLimit(`signup:email:${email.data}`, 3, 3600))) fail("/signup", tooFast);
  // Global ceiling: caps the damage of a distributed bot even if per-IP limits are evaded.
  if (!(await rateLimit("signup:global", Number(process.env.SIGNUP_HOURLY_LIMIT ?? 60), 3600))) fail("/signup", "Hệ thống đang quá tải, hãy thử lại sau.");

  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email.data!));
  if (existing?.emailVerifiedAt) {
    // Same response as a new signup so the form cannot be used to discover who has an account.
    await sendMail(email.data!, "Tài khoản đã tồn tại · Gỡ Rối Tâm", "Bạn đã có tài khoản",
      "Ai đó (có thể là bạn) vừa đăng ký bằng email này. Hãy đăng nhập, hoặc dùng “Quên mật khẩu” nếu không nhớ mật khẩu.",
      { href: `${siteUrl(await headers())}/login`, label: "Đăng nhập" });
  } else {
    // The password is NOT stored on the account yet: it travels with this signup's token and is
    // applied only if the link is opened in this same browser (see verifyEmailToken).
    const binding = { passwordHash: await hashPassword(password.data!), nonceHash: await newSignupNonce() };
    const userId = existing?.id ?? (await db
      .insert(schema.users)
      .values({ email: email.data!, passwordHash: NO_PASSWORD })
      .returning({ id: schema.users.id }))[0].id;
    await sendVerification(userId, email.data!, binding);
  }
  await rememberPending(email.data!);
  redirect("/check-email");
}

export async function resendVerification() {
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) fail("/login", "Phiên đã hết hạn. Hãy đăng nhập để nhận email mới.");
  if (!(await rateLimit(`resend:${email}`, 3, 3600))) fail("/check-email", "Bạn đã yêu cầu gửi lại nhiều lần. Hãy đợi một lúc.");
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(and(eq(schema.users.email, email!), isNull(schema.users.emailVerifiedAt)));
  // Keeps the latest signup's binding, so opening the new link in the same browser still applies that password.
  if (user) await sendVerification(user.id, user.email, (await latestSignupBinding(user.id)) ?? undefined);
  redirect("/check-email?sent=1");
}

// ---------------- sign in / out ----------------

export async function signIn(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const back = `/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  const email = Email.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email.success || !password) fail(back, "Email hoặc mật khẩu không đúng.");
  // Per account (stops distributed guessing whatever the IP) and per IP (stops one source spraying many accounts).
  const limited = "Bạn thử quá nhiều lần. Hãy đợi 15 phút.";
  if (!(await rateLimit(`login:acct:${email.data}`, 10, 900))) fail(back, limited);
  if (!(await rateLimit(`login:ip:${await clientIp()}`, 30, 900))) fail(back, limited);

  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.data!));
  if (user && !user.emailVerifiedAt) {
    // Unverified: the only password is the one carried by the latest signup token.
    const binding = await latestSignupBinding(user.id);
    if (binding && (await verifyPassword(password, binding.passwordHash))) {
      await rememberPending(user.email);
      redirect("/check-email");
    }
    fail(back, "Email hoặc mật khẩu không đúng.");
  }
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) fail(back, "Email hoặc mật khẩu không đúng.");
  if (user!.bannedAt) fail(back, "Tài khoản này đã bị khóa do vi phạm quy định cộng đồng.");
  await syncAdmin(user!.id, user!.email);
  await createSession(user!.id);
  redirect(user!.nickname ? next : "/choose-nickname");
}

export async function signOut() {
  await destroySession();
  redirect("/");
}

// ---------------- password reset ----------------

export async function requestPasswordReset(formData: FormData) {
  const email = Email.safeParse(formData.get("email"));
  if (!email.success) fail("/forgot-password", "Email không hợp lệ.");
  const allowed = (await rateLimit(`reset:ip:${await clientIp()}`, 10, 3600)) && (await rateLimit(`reset:email:${email.data}`, 3, 3600));
  if (allowed) {
    const db = await getDb();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.data!));
    if (user && !user.bannedAt) {
      const token = await issueToken(user.id, "reset");
      await sendMail(user.email, "Đặt lại mật khẩu · Gỡ Rối Tâm", "Đặt lại mật khẩu",
        "Bấm nút bên dưới để đặt mật khẩu mới. Liên kết có hiệu lực trong 1 giờ.",
        { href: `${siteUrl(await headers())}/reset-password?token=${token}`, label: "Đặt mật khẩu mới" });
    }
  }
  // Same answer whether or not the email exists.
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = Password.safeParse(formData.get("password"));
  if (!password.success) fail(`/reset-password?token=${encodeURIComponent(token)}`, "Mật khẩu tối thiểu 8 ký tự.");
  const row = await consumeToken(token, "reset");
  if (!row) fail("/forgot-password", "Liên kết đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.");
  const userId = row!.userId;
  const db = await getDb();
  // The reset link proves ownership of the mailbox, so the email counts as verified too.
  await db.update(schema.users).set({ passwordHash: await hashPassword(password.data!) }).where(eq(schema.users.id, userId));
  await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(and(eq(schema.users.id, userId), isNull(schema.users.emailVerifiedAt)));
  await destroyAllSessions(userId);
  await createSession(userId);
  const [u] = await db.select({ nickname: schema.users.nickname }).from(schema.users).where(eq(schema.users.id, userId));
  redirect(u?.nickname ? "/?reset=1" : "/choose-nickname");
}

// ---------------- profile ----------------

export async function chooseNickname(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/check-email");
  const nickname = Nickname.safeParse(formData.get("nickname"));
  if (!nickname.success) fail("/choose-nickname", "Biệt danh dài 3-24 ký tự, gồm chữ, số, dấu cách, . _ -");
  const problem = await nicknameProblem(nickname.data!, user.id);
  if (problem) fail("/choose-nickname", problem);
  const db = await getDb();
  await db.update(schema.users).set({ nickname: nickname.data! }).where(eq(schema.users.id, user.id));
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const user = await requireMember();
  const nickname = Nickname.safeParse(formData.get("nickname"));
  const bio = z.string().trim().max(160).safeParse(formData.get("bio") ?? "");
  if (!nickname.success || !bio.success) fail("/profile/settings", "Biệt danh 3-24 ký tự, giới thiệu tối đa 160 ký tự.");
  const problem = await nicknameProblem(nickname.data!, user.id);
  if (problem) fail("/profile/settings", problem);
  const db = await getDb();
  // Only these two columns are ever written from user input (no mass assignment of role/plan).
  await db.update(schema.users).set({ nickname: nickname.data!, bio: bio.data! || null }).where(eq(schema.users.id, user.id));
  redirect("/profile/settings?ok=1");
}

export async function changePassword(formData: FormData) {
  const user = await requireMember();
  const current = String(formData.get("current") ?? "");
  const next = Password.safeParse(formData.get("password"));
  if (!next.success) fail("/profile/settings", "Mật khẩu mới tối thiểu 8 ký tự.");
  if (!(await rateLimit(`pwchange:${user.id}`, 10, 900))) fail("/profile/settings", "Bạn thử quá nhiều lần. Hãy đợi 15 phút.");
  const db = await getDb();
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!(await verifyPassword(current, row.hash))) fail("/profile/settings", "Mật khẩu hiện tại không đúng.");
  await db.update(schema.users).set({ passwordHash: await hashPassword(next.data!) }).where(eq(schema.users.id, user.id));
  await destroyAllSessions(user.id);
  await createSession(user.id);
  redirect("/profile/settings?ok=1");
}

/** Permanently deletes the account; every owned row cascades (posts, comments, chats, practice, journal, sessions). */
export async function deleteAccount(formData: FormData) {
  const user = await requireMember();
  if (!(await rateLimit(`delete:${user.id}`, 10, 900))) fail("/profile/settings", "Bạn thử quá nhiều lần. Hãy đợi 15 phút.");
  const db = await getDb();
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!(await verifyPassword(String(formData.get("password") ?? ""), row.hash))) fail("/profile/settings", "Mật khẩu không đúng, tài khoản chưa bị xóa.");
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  (await cookies()).delete("grt_session");
  redirect("/?deleted=1");
}
