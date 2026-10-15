"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/modules/auth/session";
import { dayInTz, parseItems, type Item } from "./logic";

const Id = z.string().uuid();
const Title = z.string().trim().min(1).max(80);

export async function createFromTemplate(formData: FormData) {
  const { supabase, user } = await requireProfile();
  const id = Id.parse(formData.get("templateId"));
  const { data: t } = await supabase.from("practice_templates").select("name, items").eq("id", id).single();
  if (!t) redirect("/lich-tu-tap?error=" + encodeURIComponent("Không tìm thấy lịch mẫu."));
  await supabase.from("practice_schedules").insert({ user_id: user.id, title: t!.name, items: t!.items });
  revalidatePath("/lich-tu-tap");
  redirect("/lich-tu-tap");
}

export async function saveSchedule(formData: FormData) {
  const { supabase } = await requireProfile();
  const id = Id.parse(formData.get("id"));
  const title = Title.safeParse(formData.get("title"));
  const items: Item[] = parseItems(String(formData.get("items") ?? ""));
  if (!title.success || items.length === 0) {
    redirect("/lich-tu-tap?error=" + encodeURIComponent("Cần tên lịch và ít nhất một dòng dạng “06:00 Thiền 15 phút”."));
  }
  await supabase.from("practice_schedules").update({ title: title.data!, items }).eq("id", id);
  revalidatePath("/lich-tu-tap");
  redirect("/lich-tu-tap");
}

export async function deleteSchedule(formData: FormData) {
  const { supabase } = await requireProfile();
  await supabase.from("practice_schedules").delete().eq("id", Id.parse(formData.get("id")));
  revalidatePath("/lich-tu-tap");
}

export async function toggleLog(formData: FormData) {
  const { supabase, user, profile } = await requireProfile();
  const scheduleId = Id.parse(formData.get("scheduleId"));
  const key = z.string().min(1).max(20).parse(formData.get("key"));
  const day = dayInTz(profile.timezone);
  const { data: existing } = await supabase
    .from("practice_logs").select("id").eq("schedule_id", scheduleId).eq("day", day).eq("item_key", key).maybeSingle();
  if (existing) await supabase.from("practice_logs").delete().eq("id", existing.id);
  else await supabase.from("practice_logs").insert({ user_id: user.id, schedule_id: scheduleId, day, item_key: key });
  revalidatePath("/lich-tu-tap");
}

export async function addJournal(formData: FormData) {
  const { supabase, user } = await requireProfile();
  const parsed = z
    .object({ mood: z.coerce.number().int().min(1).max(5), text: z.string().trim().min(1).max(3000) })
    .safeParse({ mood: formData.get("mood"), text: formData.get("text") });
  if (!parsed.success) redirect("/nhat-ky?error=" + encodeURIComponent("Hãy chọn tâm trạng và viết vài dòng."));
  await supabase.from("journal_entries").insert({ user_id: user.id, ...parsed.data! });
  revalidatePath("/nhat-ky");
  redirect("/nhat-ky");
}

export async function deleteJournal(formData: FormData) {
  const { supabase } = await requireProfile();
  await supabase.from("journal_entries").delete().eq("id", Id.parse(formData.get("id")));
  revalidatePath("/nhat-ky");
}
