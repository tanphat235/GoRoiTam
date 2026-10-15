import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  nickname: string;
  role: "user" | "moderator" | "admin";
  plan: "free" | "premium";
  timezone: string;
  banned_at: string | null;
};

/** Returns nulls when Supabase is not configured yet so pages can render a setup notice. */
export async function getSession() {
  if (!isSupabaseConfigured()) return { supabase: null, user: null, profile: null };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, role, plan, timezone, banned_at")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profile: (profile as Profile | null) ?? null };
}

export async function requireProfile() {
  const s = await getSession();
  if (!s.supabase) redirect("/");
  if (!s.user) redirect("/dang-nhap");
  if (!s.profile) redirect("/chon-biet-danh");
  return { supabase: s.supabase, user: s.user, profile: s.profile };
}

export async function requireStaff() {
  const s = await requireProfile();
  if (s.profile.role === "user") redirect("/");
  return s;
}
