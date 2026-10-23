import { Search } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { Button, EmptyState, PageHeader, SetupNotice, inputClass } from "@/components/ui";
import { searchPosts } from "@/modules/community/queries";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Tìm kiếm" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  if (!process.env.DATABASE_URL) return <SetupNotice />;
  const user = await getCurrentUser();
  const results = q.length >= 2 ? await searchPosts(q, user?.id ?? null) : [];
  return (
    <div className="space-y-5">
      <PageHeader title="Tìm kiếm" sub="Tìm trong các bài viết của cộng đồng." />
      <form role="search" className="fade-up flex gap-2">
        <label htmlFor="q" className="sr-only">Từ khóa</label>
        <input id="q" name="q" defaultValue={q} minLength={2} placeholder="Ví dụ: lo âu, buông bỏ, gia đình…" className={inputClass} />
        <Button><Search size={16} aria-hidden /> Tìm</Button>
      </form>
      {q.length >= 2 && (results.length === 0
        ? <EmptyState title={`Không tìm thấy bài viết cho “${q}”`}>Thử từ khóa khác, hoặc hỏi Gỡ Rối Tâm.</EmptyState>
        : <div className="grid gap-4 md:grid-cols-2">{results.map((p, i) => <PostCard key={p.id} post={p} canReact={Boolean(user?.emailVerified && user.nickname)} delay={i} />)}</div>)}
    </div>
  );
}
