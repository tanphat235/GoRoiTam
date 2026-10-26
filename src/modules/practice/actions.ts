"use server";

import { and, eq, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { dayInTz, isIsoDay, parseItems } from "./logic";

const Id = z.string().uuid();
const Title = z.string().trim().min(1).max(80);
const fail = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);
const MAX_SCHEDULES = 6;

async function countSchedules(userId: string) {
  const db = await getDb();
  return (await db.select({ id: schema.practiceSchedules.id }).from(schema.practiceSchedules).where(eq(schema.practiceSchedules.userId, userId))).length;
}

export async function addFromTemplate(formData: FormData) {
  const user = await requireMember();
  const db = await getDb();
  const [t] = await db.select().from(schema.practiceTemplates).where(eq(schema.practiceTemplates.id, Id.parse(formData.get("templateId"))));
  if (!t) fail("/practice", "Không tìm thấy lịch mẫu.");
  if ((await countSchedules(user.id)) >= MAX_SCHEDULES) fail("/practice", `Tối đa ${MAX_SCHEDULES} lịch.`);
  await db.insert(schema.practiceSchedules).values({ userId: user.id, title: t!.name, items: t!.items });
  revalidatePath("/practice");
  redirect("/practice");
}

export async function saveSchedule(formData: FormData) {
  const user = await requireMember();
  const id = formData.get("id") ? Id.parse(formData.get("id")) : null;
  const title = Title.safeParse(formData.get("title"));
  const items = parseItems(String(formData.get("items") ?? ""));
  if (!title.success || items.length === 0) fail("/practice", "Cần tên lịch và ít nhất một dòng dạng “06:00 Thiền buổi sáng | 15”.");
  const db = await getDb();
  const s = schema.practiceSchedules;
  if (id) {
    await db.update(s).set({ title: title.data!, items }).where(and(eq(s.id, id), eq(s.userId, user.id)));
  } else {
    if ((await countSchedules(user.id)) >= MAX_SCHEDULES) fail("/practice", `Tối đa ${MAX_SCHEDULES} lịch.`);
    await db.insert(s).values({ userId: user.id, title: title.data!, items });
  }
  revalidatePath("/practice");
  redirect("/practice");
}

export async function deleteSchedule(formData: FormData) {
  const user = await requireMember();
  const db = await getDb();
  const s = schema.practiceSchedules;
  await db.delete(s).where(and(eq(s.id, Id.parse(formData.get("id"))), eq(s.userId, user.id)));
  revalidatePath("/practice");
}

/** Toggle an item for a day. Only today and past days can be marked. */
export async function toggleLog(formData: FormData) {
  const user = await requireMember();
  const scheduleId = Id.parse(formData.get("scheduleId"));
  const key = z.string().min(1).max(20).parse(formData.get("key"));
  const today = dayInTz(user.timezone);
  const raw = String(formData.get("day") ?? "");
  const day = isIsoDay(raw) && raw <= today ? raw : today;
  const db = await getDb();
  const s = schema.practiceSchedules;
  const [owned] = await db.select({ id: s.id }).from(s).where(and(eq(s.id, scheduleId), eq(s.userId, user.id)));
  if (!owned) return;
  const l = schema.practiceLogs;
  const removed = await db.delete(l)
    .where(and(eq(l.userId, user.id), eq(l.scheduleId, scheduleId), eq(l.day, day), eq(l.itemKey, key), lte(l.day, today)))
    .returning({ id: l.id });
  if (removed.length === 0) await db.insert(l).values({ userId: user.id, scheduleId, day, itemKey: key }).onConflictDoNothing();
  revalidatePath("/practice");
}

export async function addJournal(formData: FormData) {
  const user = await requireMember();
  const parsed = z
    .object({ mood: z.coerce.number().int().min(1).max(5), text: z.string().trim().min(1).max(3000) })
    .safeParse({ mood: formData.get("mood"), text: formData.get("text") });
  if (!parsed.success) fail("/journal", "Hãy chọn tâm trạng và viết vài dòng.");
  const db = await getDb();
  await db.insert(schema.journalEntries).values({ userId: user.id, ...parsed.data! });
  revalidatePath("/journal");
  redirect("/journal");
}

export async function deleteJournal(formData: FormData) {
  const user = await requireMember();
  const db = await getDb();
  const j = schema.journalEntries;
  await db.delete(j).where(and(eq(j.id, Id.parse(formData.get("id"))), eq(j.userId, user.id)));
  revalidatePath("/journal");
}
