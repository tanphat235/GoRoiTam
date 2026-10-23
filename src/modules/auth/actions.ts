"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroyAllSessions, destroySession, getCurrentUser, requireMember } from "@/server/auth/session";
import { consumeToken, issueToken } from "@/server/auth/tokens";
import { getDb, schema } from "@/server/db";
import { sendMail } from "@/server/mail";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { safeNext, siteUrl } from "./redirect";

const Email = z.string().trim().toLowerCase().email().max(254);
const Password = z.string().min(8, "Mật khẩu tối thiểu 8 ký tự.").max(128);
const Nickname = z.string().trim().min(3).max(24).regex(/^[\p{L}\p{N}_ .-]+$/u);
const PENDING = "grt_pending_email";

const fail = (path: string, msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

async function rememberPending(email: string) {
  (await cookies()).set(PENDING, email, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600, path: "/",
  });
}

async function sendVerification(userId: string, email: string) {
  const token = await issueToken(userId, "verify");
  const link = `${siteUrl(await headers())}/xac-nhan-email?token=${token}`;
  await sendMail(email, "Xác nhận email · Gỡ Rối Tâm", "Chào mừng bạn đến với Gỡ Rối Tâm",
    "Bấm nút bên dưới để xác nhận email và bắt đầu hành trình. Liên kết có hiệu lực trong 24 giờ.",
    { href: link, label: "Xác nhận email" });
}

/** Promotes accounts listed in ADMIN_EMAILS (production bootstrap of the first admin). */
async function syncAdmin(userId: string, email: string) {
  if (!adminEmails().includes(email)) return;
  const db = await getDb();
  await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, userId));
}

// ---------------- sign up / verify ----------------

export async function signUp(formData: FormData) {
  const email = Email.safeParse(formData.get("email"));
  const password = Password.safeParse(formData.get("password"));
  if (!email.success) fail("/dang-ky", "Email không hợp lệ.");
  if (!password.success) fail("/dang-ky", "Mật khẩu tối thiểu 8 ký tự.");
  if (!(await rateLimit(`signup:${await clientIp()}`, 5, 3600))) fail("/dang-ky", "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.");

  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email.data!));
  if (existing?.emailVerifiedAt) {
    // Same response as a new signup so the form cannot be used to discover who has an account.
    await sendMail(email.data!, "Tài khoản đã tồn tại · Gỡ Rối Tâm", "Bạn đã có tài khoản",
      "Ai đó (có thể là bạn) vừa đăng ký bằng email này. Hãy đăng nhập, hoặc dùng “Quên mật khẩu” nếu không nhớ mật khẩu.",
      { href: `${siteUrl(await headers())}/dang-nhap`, label: "Đăng nhập" });
  } else if (existing) {
    await sendVerification(existing.id, existing.email);
  } else {
    const [user] = await db
      .insert(schema.users)
      .values({ email: email.data!, passwordHash: await hashPassword(password.data!) })
      .returning({ id: schema.users.id });
    await sendVerification(user.id, email.data!);
  }
  await rememberPending(email.data!);
  redirect("/kiem-tra-email");
}

export async function resendVerification() {
  const email = (await cookies()).get(PENDING)?.value;
  if (!email) fail("/dang-nhap", "Phiên đã hết hạn. Hãy đăng nhập để nhận email mới.");
  if (!(await rateLimit(`resend:${email}`, 3, 3600))) fail("/kiem-tra-email", "Bạn đã yêu cầu gửi lại nhiều lần. Hãy đợi một lúc.");
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(and(eq(schema.users.email, email!), isNull(schema.users.emailVerifiedAt)));
  if (user) await sendVerification(user.id, user.email);
  redirect("/kiem-tra-email?sent=1");
}

/** Called by the /xac-nhan-email route with the token from the email link. */
export async function verifyEmailToken(token: string) {
  const userId = await consumeToken(token, "verify");
  if (!userId) return false;
  const db = await getDb();
  const [user] = await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .returning({ id: schema.users.id, email: schema.users.email });
  await syncAdmin(user.id, user.email);
  await createSession(user.id);
  (await cookies()).delete(PENDING);
  return true;
}

// ---------------- sign in / out ----------------

export async function signIn(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const back = `/dang-nhap${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  const email = Email.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email.success || !password) fail(back, "Email hoặc mật khẩu không đúng.");
  if (!(await rateLimit(`login:${await clientIp()}:${email.data}`, 10, 900))) fail(back, "Bạn thử quá nhiều lần. Hãy đợi 15 phút.");

  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.data!));
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) fail(back, "Email hoặc mật khẩu không đúng.");
  if (user!.bannedAt) fail(back, "Tài khoản này đã bị khóa do vi phạm quy định cộng đồng.");
  if (!user!.emailVerifiedAt) {
    await rememberPending(user!.email);
    redirect("/kiem-tra-email");
  }
  await syncAdmin(user!.id, user!.email);
  await createSession(user!.id);
  redirect(user!.nickname ? next : "/chon-biet-danh");
}

export async function signOut() {
  await destroySession();
  redirect("/");
}

// ---------------- password reset ----------------

export async function requestPasswordReset(formData: FormData) {
  const email = Email.safeParse(formData.get("email"));
  if (!email.success) fail("/quen-mat-khau", "Email không hợp lệ.");
  if (await rateLimit(`reset:${await clientIp()}:${email.data}`, 3, 3600)) {
    const db = await getDb();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.data!));
    if (user && !user.bannedAt) {
      const token = await issueToken(user.id, "reset");
      await sendMail(user.email, "Đặt lại mật khẩu · Gỡ Rối Tâm", "Đặt lại mật khẩu",
        "Bấm nút bên dưới để đặt mật khẩu mới. Liên kết có hiệu lực trong 1 giờ.",
        { href: `${siteUrl(await headers())}/dat-lai-mat-khau?token=${token}`, label: "Đặt mật khẩu mới" });
    }
  }
  redirect("/quen-mat-khau?sent=1");
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = Password.safeParse(formData.get("password"));
  if (!password.success) fail(`/dat-lai-mat-khau?token=${encodeURIComponent(token)}`, "Mật khẩu tối thiểu 8 ký tự.");
  const userId = await consumeToken(token, "reset");
  if (!userId) fail("/quen-mat-khau", "Liên kết đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.");
  const db = await getDb();
  // The reset link proves ownership of the mailbox, so the email counts as verified too.
  await db.update(schema.users).set({ passwordHash: await hashPassword(password.data!) }).where(eq(schema.users.id, userId!));
  await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(and(eq(schema.users.id, userId!), isNull(schema.users.emailVerifiedAt)));
  await destroyAllSessions(userId!);
  await createSession(userId!);
  redirect("/?reset=1");
}

// ---------------- profile ----------------

export async function chooseNickname(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (!user.emailVerified) redirect("/kiem-tra-email");
  const nickname = Nickname.safeParse(formData.get("nickname"));
  if (!nickname.success) fail("/chon-biet-danh", "Biệt danh dài 3-24 ký tự, gồm chữ, số, dấu cách, . _ -");
  const db = await getDb();
  const [taken] = await db.select({ id: schema.users.id }).from(schema.users)
    .where(and(eq(schema.users.nickname, nickname.data!), ne(schema.users.id, user.id)));
  if (taken) fail("/chon-biet-danh", "Biệt danh này đã có người dùng.");
  await db.update(schema.users).set({ nickname: nickname.data! }).where(eq(schema.users.id, user.id));
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const user = await requireMember();
  const nickname = Nickname.safeParse(formData.get("nickname"));
  const bio = z.string().trim().max(160).safeParse(formData.get("bio") ?? "");
  if (!nickname.success || !bio.success) fail("/ho-so/cai-dat", "Biệt danh 3-24 ký tự, giới thiệu tối đa 160 ký tự.");
  const db = await getDb();
  const [taken] = await db.select({ id: schema.users.id }).from(schema.users)
    .where(and(eq(schema.users.nickname, nickname.data!), ne(schema.users.id, user.id)));
  if (taken) fail("/ho-so/cai-dat", "Biệt danh này đã có người dùng.");
  await db.update(schema.users).set({ nickname: nickname.data!, bio: bio.data! || null }).where(eq(schema.users.id, user.id));
  redirect("/ho-so/cai-dat?ok=1");
}

export async function changePassword(formData: FormData) {
  const user = await requireMember();
  const current = String(formData.get("current") ?? "");
  const next = Password.safeParse(formData.get("password"));
  if (!next.success) fail("/ho-so/cai-dat", "Mật khẩu mới tối thiểu 8 ký tự.");
  const db = await getDb();
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!(await verifyPassword(current, row.hash))) fail("/ho-so/cai-dat", "Mật khẩu hiện tại không đúng.");
  await db.update(schema.users).set({ passwordHash: await hashPassword(next.data!) }).where(eq(schema.users.id, user.id));
  await destroyAllSessions(user.id);
  await createSession(user.id);
  redirect("/ho-so/cai-dat?ok=1");
}

/** Permanently deletes the account; every owned row cascades (posts, comments, chats, practice, journal). */
export async function deleteAccount(formData: FormData) {
  const user = await requireMember();
  const db = await getDb();
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!(await verifyPassword(String(formData.get("password") ?? ""), row.hash))) fail("/ho-so/cai-dat", "Mật khẩu không đúng, tài khoản chưa bị xóa.");
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  (await cookies()).delete("grt_session");
  redirect("/?deleted=1");
}
