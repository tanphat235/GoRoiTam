import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { MessageSquarePlus } from "lucide-react";
import { z } from "zod";
import { PageHeader, SetupNotice } from "@/components/ui";
import type { Source } from "@/modules/ai/format";
import { getCurrentUser } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { LIMITS, usageToday } from "@/server/quota";
import { ChatClient } from "./chat-client";

export const metadata = { title: "Hỏi Gỡ Rối Tâm" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const sp = await searchParams;
  if (!process.env.DATABASE_URL) return <SetupNotice />;
  const user = await getCurrentUser();
  const member = user?.emailVerified && user.nickname ? user : null;
  const convId = sp.c && z.string().uuid().safeParse(sp.c).success ? sp.c : null;

  let initial: { role: "user" | "assistant"; content: string; sources?: Source[] }[] = [];
  let conversations: { id: string; title: string }[] = [];
  let sub = "Dùng thử 1 lượt không cần đăng ký. Cuộc trò chuyện của thành viên được lưu riêng tư.";

  if (member) {
    const db = await getDb();
    const c = schema.aiConversations;
    const m = schema.aiMessages;
    conversations = await db.select({ id: c.id, title: c.title }).from(c).where(eq(c.userId, member.id)).orderBy(desc(c.createdAt)).limit(12);
    if (convId) {
      initial = (await db.select({ role: m.role, content: m.content, sources: m.sources }).from(m)
        .innerJoin(c, eq(c.id, m.conversationId))
        .where(and(eq(c.id, convId), eq(c.userId, member.id))).orderBy(asc(m.createdAt))) as typeof initial;
    }
    const used = await usageToday(member.id);
    sub = `Hôm nay bạn đã hỏi ${used.ai}/${LIMITS[member.plan].ai} lượt. Cuộc trò chuyện là riêng tư.`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="order-2 lg:order-1">
        {member && (
          <nav aria-label="Lịch sử trò chuyện" className="fade-up space-y-1 lg:sticky lg:top-24">
            <Link href="/hoi" className="mb-2 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-2.5 text-sm font-medium text-primary"><MessageSquarePlus size={16} aria-hidden /> Cuộc trò chuyện mới</Link>
            {conversations.map((c) => (
              <Link key={c.id} href={`/hoi?c=${c.id}`} aria-current={c.id === convId ? "page" : undefined}
                className={`block truncate rounded-xl px-3 py-2 text-sm ${c.id === convId ? "bg-surface font-medium shadow-soft" : "text-muted hover:bg-surface"}`}>{c.title}</Link>
            ))}
          </nav>
        )}
      </aside>
      <div className="order-1 min-w-0 lg:order-2">
        <PageHeader eyebrow="Lắng nghe · Phân tích · Định hướng" title="Hỏi Gỡ Rối Tâm" sub={sub} />
        <ChatClient key={convId ?? "new"} initial={initial} conversationId={convId} initialQuery={convId ? "" : (sp.q ?? "").slice(0, 2000)} loggedIn={Boolean(member)} />
        <p className="mt-4 text-center text-xs text-muted">AI có thể sai. Đây không phải lời khuyên y tế hay pháp lý và không thay thế thầy hoặc chuyên gia.</p>
      </div>
    </div>
  );
}
