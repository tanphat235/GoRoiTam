"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Leaf } from "lucide-react";
import { Lotus } from "@/components/lotus";
import { Reply } from "@/components/reply";
import type { Source } from "@/modules/ai/format";

type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; locked?: boolean };

const ERRORS: Record<string, string> = {
  quota: "Bạn đã dùng hết lượt hỏi AI hôm nay. Mai quay lại nhé.",
  guest_limit: "Bạn đã dùng lượt thử miễn phí.",
  need_profile: "Hãy hoàn tất xác nhận email và chọn biệt danh trước khi hỏi.",
  ai_failed: "AI đang gặp sự cố, lượt hỏi của bạn không bị tính. Hãy thử lại sau.",
  not_configured: "Hệ thống chưa được cấu hình.",
  forbidden: "Yêu cầu không hợp lệ.",
};

const SUGGESTIONS = [
  "Mình hay lo lắng về công việc, làm sao để bình tĩnh hơn?",
  "Làm sao để buông bỏ những kỳ vọng vào người khác?",
  "Mình hay nổi giận với người thân rồi lại hối hận.",
  "Làm sao để duy trì thói quen tu tập mỗi ngày?",
];

export function ChatClient({ initial, conversationId: initialConv, initialQuery, loggedIn }: {
  initial: Msg[]; conversationId: string | null; initialQuery: string; loggedIn: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [conv, setConv] = useState<string | null>(initialConv);
  const [input, setInput] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needSignup, setNeedSignup] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: conv ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? ERRORS[json.error] ?? "Đã có lỗi, hãy thử lại.");
        if (json.error === "guest_limit") setNeedSignup(true);
        setMessages((m) => m.slice(0, -1));
        setInput(message);
        return;
      }
      if (json.conversationId && json.conversationId !== conv) {
        setConv(json.conversationId);
        window.history.replaceState(null, "", `/hoi?c=${json.conversationId}`);
      }
      if (json.locked) setNeedSignup(true);
      setMessages((m) => [...m, { role: "assistant", content: json.reply, sources: json.sources, locked: json.locked }]);
    } catch {
      setError("Mất kết nối, hãy thử lại.");
      setMessages((m) => m.slice(0, -1));
      setInput(message);
    } finally {
      setBusy(false);
    }
  }

  // Landing-page handoff: ?q=... is sent once.
  useEffect(() => {
    if (initialQuery && !autoSent.current && initial.length === 0) {
      autoSent.current = true;
      void send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="fade-up py-6 text-center">
            <Lotus size={64} className="breathe mx-auto" />
            <p className="mx-auto mt-4 max-w-md text-muted">Hãy kể điều bạn đang gặp. Mình sẽ lắng nghe trước, rồi cùng nhìn qua giáo lý và gợi ý một việc nhỏ để thực hành.</p>
            <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={s} onClick={() => void send(s)} className={`fade-up delay-${i + 1} lift rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm`}>
                  <Leaf size={14} aria-hidden className="mb-1 text-primary" />{s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="fade-up ml-auto max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-primary px-5 py-3 text-sm text-white shadow-soft dark:text-[#10170f]">{m.content}</div>
          ) : (
            <div key={i} className="fade-up flex max-w-[95%] items-start gap-3">
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft"><Lotus size={24} /></span>
              <div className="min-w-0 flex-1 rounded-3xl rounded-tl-md border border-border bg-surface px-5 py-4 shadow-soft">
                <Reply text={m.content} sources={m.sources} />
                {m.locked && (
                  <p className="mt-4 rounded-2xl bg-primary-soft p-3 text-sm">
                    Phần <b>Thực hành</b> dành cho thành viên. <Link href="/dang-ky" className="font-medium text-primary underline">Đăng ký miễn phí</Link> để xem tiếp, lưu lịch sử và lập lịch tu tập.
                  </p>
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft"><Lotus size={24} className="breathe" /></span>
            <span className="typing flex gap-1 rounded-full border border-border bg-surface px-4 py-3" aria-label="Đang trả lời">
              <span className="h-2 w-2 rounded-full bg-primary" /><span className="h-2 w-2 rounded-full bg-primary" /><span className="h-2 w-2 rounded-full bg-primary" />
            </span>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {error && <p role="alert" className="mt-4 rounded-2xl border border-warn/50 bg-warn/5 px-4 py-2.5 text-sm text-warn">{error}</p>}
      {needSignup && !loggedIn && (
        <p className="mt-3 text-sm"><Link href="/dang-ky" className="font-medium text-primary underline">Đăng ký</Link> hoặc <Link href="/dang-nhap?next=/hoi" className="font-medium text-primary underline">đăng nhập</Link> để tiếp tục.</p>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-24 mt-6 lg:bottom-4">
        <div className="flex items-end gap-2 rounded-[1.75rem] border border-border bg-surface p-2 shadow-soft focus-within:border-sage">
          <label htmlFor="msg" className="sr-only">Tin nhắn</label>
          <textarea
            id="msg" value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={2000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            placeholder="Nhập câu hỏi tiếp theo…" className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm focus:outline-none"
          />
          <button disabled={busy || !input.trim()} aria-label="Gửi" className="shine flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-transform hover:scale-105 disabled:opacity-40 dark:text-[#10170f]">
            <ArrowUp size={20} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
