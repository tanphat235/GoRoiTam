import type { Source } from "@/modules/ai/format";

/** Minimal, XSS-safe renderer for the three-part reply: `## heading`, `1. item`, paragraphs. Text only, no HTML. */
export function Reply({ text, sources = [] }: { text: string; sources?: Source[] }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ol key={`l${blocks.length}`}>{list.map((li, i) => <li key={i}>{li}</li>)}</ol>,
      );
      list = [];
    }
  };
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    if (t.startsWith("## ")) { flush(); blocks.push(<h2 key={blocks.length}>{t.slice(3)}</h2>); continue; }
    const m = t.match(/^(?:\d+[.)]|[-*])\s+(.*)$/);
    if (m) { list.push(m[1]); continue; }
    flush();
    blocks.push(<p key={blocks.length}>{t}</p>);
  }
  flush();
  return (
    <div className="prose-reply text-sm">
      {blocks}
      {sources.length > 0 && (
        <>
          <h2>Nguồn tham khảo</h2>
          <ul className="text-xs text-muted">
            {sources.map((s) => (
              <li key={s.n}>
                [{s.n}] {s.title}{s.locator ? ` — ${s.locator}` : ""}{s.verified ? "" : " (nội dung mẫu, chưa xác minh)"}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
