"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSession, requireProfile } from "./session";

const Credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});
const Nickname = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[\p{L}\p{N}_ .-]+$/u);

const go = (path: string, error: string): never => redirect(`${path}?error=${encodeURIComponent(error)}`);

export async function signUp(formData: FormData) {
  const parsed = Credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("/dang-ky", "Email không hợp lệ hoặc mật khẩu dưới 8 ký tự.");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data!);
  if (error) go("/dang-ky", "Không thể đăng ký. Hãy thử email khác hoặc đăng nhập.");
  if (!data!.session) go("/dang-nhap", "Hãy xác nhận email (kiểm tra hộp thư) rồi đăng nhập.");
  redirect("/chon-biet-danh");
}

export async function signIn(formData: FormData) {
  const parsed = Credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("/dang-nhap", "Email hoặc mật khẩu không đúng.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data!);
  if (error) go("/dang-nhap", "Email hoặc mật khẩu không đúng.");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createProfile(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect("/dang-nhap");
  const nickname = Nickname.safeParse(formData.get("nickname"));
  if (!nickname.success) go("/chon-biet-danh", "Biệt danh dài 3-24 ký tự, chỉ gồm chữ, số, dấu cách, . _ -");
  const timezone = String(formData.get("timezone") || "Asia/Ho_Chi_Minh");
  const { error } = await supabase!.from("profiles").insert({ id: user!.id, nickname: nickname.data!, timezone });
  if (error) go("/chon-biet-danh", error.code === "23505" ? "Biệt danh này đã có người dùng." : "Không thể tạo hồ sơ.");
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireProfile();
  const nickname = Nickname.safeParse(formData.get("nickname"));
  if (!nickname.success) go("/ho-so", "Biệt danh không hợp lệ.");
  const { error } = await supabase.from("profiles").update({ nickname: nickname.data! }).eq("id", user.id);
  if (error) go("/ho-so", error.code === "23505" ? "Biệt danh này đã có người dùng." : "Không thể cập nhật.");
  redirect("/ho-so?ok=1");
}

/** Deletes the auth user; every owned row cascades (posts, comments, AI chats, practice, journal). */
export async function deleteAccount(formData: FormData) {
  const { user } = await requireProfile();
  if (formData.get("confirm") !== "XOA") go("/ho-so", "Gõ đúng chữ XOA để xác nhận.");
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) go("/ho-so", "Không thể xóa tài khoản lúc này.");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
