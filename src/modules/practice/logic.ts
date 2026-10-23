import type { PracticeItem } from "@/server/db/schema";

export type Item = PracticeItem;

/** Stable key from time + label, so completion marks survive reordering or adding lines. */
function itemKey(time: string, label: string) {
  let h = 5381;
  for (const ch of `${time}|${label.toLowerCase()}`) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return h.toString(36);
}

/** Parse lines like "06:00 Thiền buổi sáng | 15" (minutes optional). Invalid lines are skipped. */
export function parseItems(text: string): Item[] {
  const seen = new Set<string>();
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line): Omit<Item, "key"> | null => {
      const m = line.match(/^([01]?\d|2[0-3])[:h]([0-5]\d)\s+(.+?)(?:\s*\|\s*(\d{1,3}))?$/);
      if (!m) return null;
      const minutes = m[4] ? Math.min(Number(m[4]), 600) : undefined;
      return { time: `${m[1].padStart(2, "0")}:${m[2]}`, label: m[3].slice(0, 80), ...(minutes ? { minutes } : {}) };
    })
    .filter((x): x is Omit<Item, "key"> => x !== null)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 12)
    .map((it) => {
      let key = itemKey(it.time, it.label);
      while (seen.has(key)) key += "x"; // identical lines still get distinct keys
      seen.add(key);
      return { key, ...it };
    });
}

export function itemsToText(items: Item[]) {
  return items.map((i) => `${i.time} ${i.label}${i.minutes ? ` | ${i.minutes}` : ""}`).join("\n");
}

/** Local calendar day (YYYY-MM-DD) in the user's timezone. */
export function dayInTz(tz: string, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Monday-first week containing `day`. */
export function weekOf(day: string) {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  return Array.from({ length: 7 }, (_, i) => shift(day, i - dow));
}

export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/**
 * Streak = consecutive days with at least one completed item, ending today
 * (or yesterday, so the streak is not lost before the user practises today).
 */
export function computeStreak(days: string[], today: string) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : shift(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = shift(cursor, -1);
  }
  return n;
}

export const isIsoDay = (s: string | undefined): s is string => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)));
