import { describe, expect, it } from "vitest";
import { computeStreak, itemsToText, parseItems, weekOf } from "@/modules/practice/logic";

describe("parseItems", () => {
  it("parses valid lines and skips invalid ones", () => {
    const items = parseItems("6:05 Thiền 10 phút\nkhông có giờ\n21:30 Niệm Phật");
    expect(items.map((i) => i.time)).toEqual(["06:05", "21:30"]);
    expect(new Set(items.map((i) => i.key)).size).toBe(2);
  });
  it("gives identical lines distinct keys", () => {
    expect(new Set(parseItems("06:00 A\n06:00 A").map((i) => i.key)).size).toBe(2);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-10-15", "2026-10-14", "2026-10-13", "2026-10-10"], "2026-10-15")).toBe(3);
  });
  it("keeps the streak alive until the end of today", () => {
    expect(computeStreak(["2026-10-14", "2026-10-13"], "2026-10-15")).toBe(2);
  });
  it("is zero after a missed day", () => {
    expect(computeStreak(["2026-10-12"], "2026-10-15")).toBe(0);
  });
});

describe("schedule text round trip", () => {
  it("keeps minutes and sorts by time", () => {
    const items = parseItems("21:00 Niệm Phật | 10\n06:00 Thiền buổi sáng | 15");
    expect(items.map((i) => i.time)).toEqual(["06:00", "21:00"]);
    expect(items[0].minutes).toBe(15);
    expect(parseItems(itemsToText(items))).toEqual(items);
  });
  it("keeps keys stable when lines are added or reordered", () => {
    const before = parseItems("06:00 Thiền | 15\n21:00 Niệm Phật");
    const after = parseItems("05:00 Dậy sớm\n21:00 Niệm Phật\n06:00 Thiền | 15");
    const keyOf = (xs: typeof before, label: string) => xs.find((x) => x.label === label)!.key;
    expect(keyOf(after, "Thiền")).toBe(keyOf(before, "Thiền"));
    expect(keyOf(after, "Niệm Phật")).toBe(keyOf(before, "Niệm Phật"));
  });
});

describe("weekOf", () => {
  it("returns Monday..Sunday around the day", () => {
    expect(weekOf("2026-10-23")).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(weekOf("2026-10-25")[0]).toBe("2026-10-19");
  });
});
