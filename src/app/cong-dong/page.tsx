import Link from "next/link";
import { Button, Card, LinkButton, Notice, PageTitle, SetupNotice, inputClass } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSession } from "@/modules/auth/session";
import { createPost, toggleReaction } from "@/modules/community/actions";
import { TOPICS } from "@/modules/community/topics";

export const metadata = { title: "Cộng đồng" };

type Post = {
  id: string; body: string; topic: string; is_anonymous: boolean; created_at: string;
  nickname: string | null; reaction_count: number; comment_count: number;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  const sp = await searchParams;
  const anonTab = sp.tab === "an-danh";
  const { supabase, profile } = await getSession();
  let posts: Post[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("public_posts").select("*").eq("is_anonymous", anonTab)
      .order("created_at", { ascending: false }).limit(30);
    posts = (data ?? []) as Post[];
  }
  const tabClass = (on: boolean) => `rounded-full px-4 py-1.5 text-sm ${on ? "bg-primary text-white" : "border border-border bg-surface"}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Cộng đồng" sub="Nơi chia sẻ và đồng cảm. Hãy nhẹ nhàng, không tranh luận tôn giáo, không phán xét." />
      {!isSupabaseConfigured() && <SetupNotice />}
      {sp.error && <Notice kind="error">{sp.error}</Notice>}

      <Card className="mb-5">
        {profile ? (
          <form action={createPost} className="space-y-3">
            <label htmlFor="body" className="sr-only">Nội dung</label>
            <textarea id="body" name="body" rows={3} maxLength={3000} required placeholder="Bạn muốn chia sẻ điều gì?" className={inputClass} />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select name="topic" aria-label="Chủ đề" className={`${inputClass} w-auto`}>
                {Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label className="flex items-center gap-2"><input type="checkbox" name="anonymous" defaultChecked={anonTab} /> Đăng ẩn danh</label>
              <Button className="ml-auto">Đăng (tối đa 2 bài/ngày)</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm">Hãy <Link href="/dang-nhap" className="underline">đăng nhập</Link> hoặc <Link href="/dang-ky" className="underline">đăng ký</Link> để đăng bài, bình luận và đồng cảm.</p>
        )}
      </Card>

      <div className="mb-4 flex gap-2" role="tablist" aria-label="Bảng tin">
        <Link href="/cong-dong" className={tabClass(!anonTab)} aria-current={!anonTab ? "page" : undefined}>Cộng đồng</Link>
        <Link href="/cong-dong?tab=an-danh" className={tabClass(anonTab)} aria-current={anonTab ? "page" : undefined}>Bài ẩn danh</Link>
      </div>

      <div className="space-y-3">
        {posts.length === 0 && <p className="text-sm text-muted">Chưa có bài nào. {profile ? "Bạn có thể là người đầu tiên chia sẻ." : ""}</p>}
        {posts.map((p) => (
          <Card key={p.id}>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">{p.is_anonymous ? "Ẩn danh" : p.nickname}</span>
              <span>· {TOPICS[p.topic as keyof typeof TOPICS] ?? "Khác"}</span>
              <time dateTime={p.created_at}>· {new Date(p.created_at).toLocaleDateString("vi-VN")}</time>
            </div>
            <Link href={`/cong-dong/${p.id}`} className="block whitespace-pre-wrap text-sm leading-relaxed">
              {p.body.length > 400 ? `${p.body.slice(0, 400)}…` : p.body}
            </Link>
            <div className="mt-3 flex items-center gap-3 text-sm">
              {profile ? (
                <form action={toggleReaction}>
                  <input type="hidden" name="postId" value={p.id} />
                  <button className="rounded-full border border-border px-3 py-1 hover:bg-primary-soft" aria-label="Đồng cảm">🤍 Đồng cảm · {p.reaction_count}</button>
                </form>
              ) : <span className="text-muted">🤍 {p.reaction_count}</span>}
              <Link href={`/cong-dong/${p.id}`} className="text-muted underline">{p.comment_count} bình luận</Link>
            </div>
          </Card>
        ))}
      </div>
      {!profile && <div className="mt-6"><LinkButton href="/dang-ky">Tham gia cộng đồng</LinkButton></div>}
    </div>
  );
}
