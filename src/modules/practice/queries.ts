import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { computeStreak } from "./logic";

export async function practiceOverview(userId: string, today: string, from: string) {
  const db = await getDb();
  const s = schema.practiceSchedules;
  const l = schema.practiceLogs;
  const [schedules, logs, templates] = await Promise.all([
    db.select().from(s).where(eq(s.userId, userId)).orderBy(s.createdAt),
    db.select({ scheduleId: l.scheduleId, day: l.day, itemKey: l.itemKey }).from(l).where(and(eq(l.userId, userId), gte(l.day, from))),
    db.select().from(schema.practiceTemplates),
  ]);
  const streak = computeStreak([...new Set(logs.map((x) => x.day))], today);
  return { schedules, logs, templates, streak };
}

export async function listJournal(userId: string, limit = 50) {
  const db = await getDb();
  const j = schema.journalEntries;
  return db.select().from(j).where(eq(j.userId, userId)).orderBy(desc(j.createdAt)).limit(limit);
}
