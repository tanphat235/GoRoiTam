import { describe, expect, it } from "vitest";
import { checkMessage } from "@/modules/ai/guard";
import { finalizeReply, lockPractice } from "@/modules/ai/format";

const chunks = [
  { id: "a", source_title: "Nguồn A", locator: "Vô thường", text: "x", verified: false },
  { id: "b", source_title: "Nguồn B", locator: null, text: "y", verified: true },
];

describe("checkMessage", () => {
  it("flags crisis phrases with or without accents", () => {
    expect(checkMessage("Mình muốn chết quá").ok && (checkMessage("Mình muốn chết quá") as { crisis: boolean }).crisis).toBe(true);
    expect((checkMessage("toi tu tu thoi") as { crisis: boolean }).crisis).toBe(true);
  });
  it("does not flag unrelated words that contain the letters", () => {
    expect((checkMessage("Mình đang suy nghĩ về tư tưởng của bản thân") as { crisis: boolean }).crisis).toBe(false);
  });
  it("rejects empty and over-long input", () => {
    expect(checkMessage("  ").ok).toBe(false);
    expect(checkMessage("a".repeat(2001)).ok).toBe(false);
  });
});

describe("finalizeReply", () => {
  const reply = "## Thấu hiểu\nA\n## Góc nhìn Phật pháp\nB [1] và [7] và [2]\n## Thực hành\n1. C";
  it("keeps only citations that point at retrieved chunks", () => {
    const r = finalizeReply(reply, chunks);
    expect(r.text).not.toContain("[7]");
    expect(r.sources.map((s) => s.n)).toEqual([1, 2]);
    expect(r.formatOk).toBe(true);
  });
  it("reports a malformed reply", () => {
    expect(finalizeReply("chỉ một đoạn", chunks).formatOk).toBe(false);
  });
});

describe("lockPractice", () => {
  it("hides the practice section from guests", () => {
    const r = lockPractice("## Thấu hiểu\nA\n## Thực hành\n1. C");
    expect(r.locked).toBe(true);
    expect(r.visible).not.toContain("Thực hành");
  });
});
