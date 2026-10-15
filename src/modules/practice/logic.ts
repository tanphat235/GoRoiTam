export type Item = { key: string; time: string; label: string };

/** Parse lines like "06:00 Thiền 15 phút" into items. Invalid lines are skipped. */
export function parseItems(text: string): Item[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^([01]?\d|2[0-3]):([0-5]\d)\s+(.+)$/);
      if (!m) return null;
      return { key: `i${i}`, time: `${m[1].padStart(2, "0")}:${m[2]}`, label: m[3].slice(0, 120) };
    })
    .filter((x): x is Item => x !== null)
    .slice(0, 12);
}

export function itemsToText(items: Item[]) {
  return items.map((i) => `${i.time} ${i.label}`).join("\n");
}

/** Local calendar day (YYYY-MM-DD) in the user's timezone. */
export function dayInTz(tz: string, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Streak = consecutive days with at least one completed item, ending today
 * (or yesterday, so the streak is not lost before the user practises today).
 */
export function computeStreak(days: string[], today: string) {
  const set = new Set(days);
  const prev = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  let cursor = set.has(today) ? today : prev(today);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = prev(cursor);
  }
  return n;
}
