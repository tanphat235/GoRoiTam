import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { normalize } from "./guard";
import type { Chunk } from "./prompt";

/** Accent-insensitive words of 3+ letters, joined with OR for a forgiving full-text match. */
export function toTsQuery(q: string) {
  const words = [...new Set(normalize(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2))].slice(0, 16);
  return words.length ? words.join(" | ") : null;
}

export async function searchTeachings(q: string, k = 4): Promise<Chunk[]> {
  const query = toTsQuery(q);
  if (!query) return [];
  const db = await getDb();
  const c = schema.teachingChunks;
  const s = schema.teachingSources;
  const tsq = sql`to_tsquery('simple', ${query})`;
  return db
    .select({ id: c.id, source_title: s.title, locator: c.locator, text: c.text, verified: s.verified })
    .from(c)
    .innerJoin(s, eq(s.id, c.sourceId))
    .where(sql`${c.tsv} @@ ${tsq}`)
    .orderBy(desc(sql`ts_rank(${c.tsv}, ${tsq})`))
    .limit(Math.min(k, 8));
}
