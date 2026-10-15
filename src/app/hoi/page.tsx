import Link from "next/link";
import { PageTitle, SetupNotice } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSession } from "@/modules/auth/session";
import type { Source } from "@/modules/ai/format";
import { ChatClient } from "./chat-client";

export const metadata = { title: "Hỏi Gỡ Rối Tâm" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  if (user && !profile) return <p>Hãy <Link href="/chon-biet-danh" className="underline">chọn biệt danh</Link> trước.</p>;

  let initial: { role: "user" | "assistant"; content: string; sources?: Source[] }[] = [];
  let conversations: { id: string; title: string }[] = [];
  let used = 0;

  if (supabase && user) {
    const { data: convs } = await supabase.from("ai_conversations").select("id, title").order("created_at", { ascending: false }).limit(8);
    conversations = convs ?? [];
    if (sp.c) {
      const { data: rows } = await supabase.from("ai_messages").select("role, content, sources").eq("conversation_id", sp.c).order("created_at");
      initial = (rows ?? []) as typeof initial;
    }
    const { data: u } = await supabase.from("usage_daily").select("ai_count").eq("day", new Date().toISOString().slice(0, 10)).maybeSingle();
    used = u?.ai_count ?? 0;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Hỏi Gỡ Rối Tâm" sub={user ? `Hôm nay bạn đã hỏi ${used}/${profile?.plan === "premium" ? 30 : 2} lượt. Cuộc trò chuyện là riêng tư.` : "Dùng thử 1 lượt không cần đăng ký."} />
      {!isSupabaseConfigured() && <SetupNotice />}
      {conversations.length > 0 && (
        <nav aria-label="Lịch sử" className="mb-4 flex flex-wrap gap-2 text-xs">
          <Link href="/hoi" className="rounded-full border border-border bg-surface px-3 py-1">+ Mới</Link>
          {conversations.map((c) => (
            <Link key={c.id} href={`/hoi?c=${c.id}`} className="max-w-48 truncate rounded-full border border-border bg-surface px-3 py-1">{c.title}</Link>
          ))}
        </nav>
      )}
      <ChatClient key={sp.c ?? "new"} initial={initial} conversationId={sp.c ?? null} initialQuery={sp.c ? "" : (sp.q ?? "").slice(0, 2000)} loggedIn={Boolean(user)} />
      <p className="mt-4 text-xs text-muted">AI có thể sai. Đây không phải lời khuyên y tế hay pháp lý và không thay thế thầy hoặc chuyên gia.</p>
    </div>
  );
}
