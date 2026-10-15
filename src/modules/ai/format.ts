import type { Chunk } from "./prompt";

export type Source = { n: number; title: string; locator: string | null; verified: boolean };

const REQUIRED = ["## Thấu hiểu", "## Góc nhìn Phật pháp", "## Thực hành"];

/**
 * Citations come from the server, never from the model: keep only [n] that point at
 * retrieved chunks, drop the rest, and build the "Nguồn" list from what was actually referenced.
 */
export function finalizeReply(raw: string, chunks: Chunk[]) {
  const used = new Set<number>();
  const text = raw.replace(/\s?\[(\d{1,2})\]/g, (_m, d: string) => {
    const n = Number(d);
    if (n >= 1 && n <= chunks.length) {
      used.add(n);
      return ` [${n}]`;
    }
    return "";
  });
  const sources: Source[] = [...used]
    .sort((a, b) => a - b)
    .map((n) => ({ n, title: chunks[n - 1].source_title, locator: chunks[n - 1].locator, verified: chunks[n - 1].verified }));
  const formatOk = REQUIRED.every((h) => text.includes(h));
  return { text, sources, formatOk };
}

/** Guests see the first two sections; the practice section is the signup nudge. */
export function lockPractice(text: string) {
  const i = text.indexOf("## Thực hành");
  return i === -1 ? { visible: text, locked: false } : { visible: text.slice(0, i).trimEnd(), locked: true };
}
