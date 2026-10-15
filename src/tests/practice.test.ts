import { describe, expect, it } from "vitest";
import { computeStreak, parseItems } from "@/modules/practice/logic";

describe("parseItems", () => {
  it("parses valid lines and skips invalid ones", () => {
    const items = parseItems("6:05 Thiền 10 phút\nkhông có giờ\n21:30 Niệm Phật");
    expect(items.map((i) => i.time)).toEqual(["06:05", "21:30"]);
    expect(new Set(items.map((i) => i.key)).size).toBe(2);
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
