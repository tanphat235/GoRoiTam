"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Reply } from "@/components/reply";
import { Button, inputClass } from "@/components/ui";
import type { Source } from "@/modules/ai/format";

type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; locked?: boolean };

const ERRORS: Record<string, string> = {
  quota: "Bạn đã dùng hết lượt hỏi AI hôm nay. Mai quay lại nhé.",
  guest_limit: "Bạn đã dùng lượt thử miễn phí.",
  need_profile: "Hãy chọn biệt danh trước khi hỏi.",
  banned: "Tài khoản của bạn đang bị khóa.",
  ai_failed: "AI đang gặp sự cố, lượt hỏi của bạn không bị tính. Hãy thử lại sau.",
  not_configured: "Hệ thống chưa được cấu hình.",
};

export function ChatClient({
  initial,
  conversationId: initialConv,
  initialQuery,
  loggedIn,
}: {
  initial: Msg[];
  conversationId: string | null;
  initialQuery: string;
  loggedIn: boolean;
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
      if (json.conversationId) setConv(json.conversationId);
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

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-muted">Hãy kể điều bạn đang gặp. Mình sẽ lắng nghe trước, rồi cùng nhìn qua giáo lý và gợi ý một việc nhỏ.</p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary-soft px-4 py-2 text-sm">{m.content}</div>
          ) : (
            <div key={i} className="max-w-[95%] rounded-2xl border border-border bg-surface px-4 py-3">
              <Reply text={m.content} sources={m.sources} />
              {m.locked && (
                <p className="mt-3 rounded-xl bg-primary-soft p-3 text-sm">
                  Phần <b>Thực hành</b> dành cho thành viên. <Link href="/dang-ky" className="underline">Đăng ký miễn phí</Link> để xem tiếp, lưu lịch sử và lập lịch tu tập.
                </p>
              )}
            </div>
          ),
        )}
        {busy && <p className="text-sm text-muted">Đang lắng nghe và suy ngẫm…</p>}
        <div ref={bottom} />
      </div>

      {error && <p role="alert" className="rounded-xl border border-warn bg-surface px-3 py-2 text-sm text-warn">{error}</p>}
      {needSignup && !loggedIn && (
        <p className="text-sm">
          <Link href="/dang-ky" className="text-primary-hover underline">Đăng ký</Link> hoặc <Link href="/dang-nhap" className="text-primary-hover underline">đăng nhập</Link> để tiếp tục.
        </p>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-20 flex gap-2 md:bottom-4">
        <label htmlFor="msg" className="sr-only">Tin nhắn</label>
        <textarea id="msg" value={input} onChange={(e) => setInput(e.target.value)} rows={2} maxLength={2000} placeholder="Bạn muốn gỡ rối điều gì?" className={inputClass} />
        <Button disabled={busy || !input.trim()}>Gửi</Button>
      </form>
    </div>
  );
}
