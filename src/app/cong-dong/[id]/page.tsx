import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button, Card, Notice, inputClass } from "@/components/ui";
import { getSession } from "@/modules/auth/session";
import { addComment, deleteOwnPost, reportContent, toggleReaction } from "@/modules/community/actions";
import { TOPICS } from "@/modules/community/topics";

type Post = { id: string; body: string; topic: string; is_anonymous: boolean; created_at: string; author_id: string | null; nickname: string | null; reaction_count: number };
type Comment = { id: string; body: string; created_at: string; nickname: string; author_id: string };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  if (!supabase) notFound();

  const { data: post } = await supabase.from("public_posts").select("*").eq("id", id).maybeSingle<Post>();
  if (!post) notFound();
  const { data: comments } = await supabase.from("public_comments").select("*").eq("post_id", id).order("created_at");

  // Owner check uses the table (RLS: only my own rows) because the view hides author_id on anonymous posts.
  let isOwner = false;
  if (profile) {
    const { data: mine } = await supabase.from("posts").select("id").eq("id", id).eq("author_id", profile.id).maybeSingle();
    isOwner = Boolean(mine);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/cong-dong" className="text-sm text-muted underline">← Bảng tin</Link>
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.ok && <Notice kind="ok">{sp.ok}</Notice>}

      <Card>
        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
          <span className="font-medium text-foreground">{post.is_anonymous ? "Ẩn danh" : post.nickname}</span>
          <span>· {TOPICS[post.topic as keyof typeof TOPICS] ?? "Khác"}</span>
          <time dateTime={post.created_at}>· {new Date(post.created_at).toLocaleString("vi-VN")}</time>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {profile ? (
            <form action={toggleReaction}>
              <input type="hidden" name="postId" value={post.id} />
              <button className="rounded-full border border-border px-3 py-1 hover:bg-primary-soft">🤍 Đồng cảm · {post.reaction_count}</button>
            </form>
          ) : <span className="text-muted">🤍 {post.reaction_count}</span>}
          {isOwner && (
            <form action={deleteOwnPost}>
              <input type="hidden" name="postId" value={post.id} />
              <Button variant="danger" className="!px-3 !py-1">Xóa bài</Button>
            </form>
          )}
        </div>
        {profile && !isOwner && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted">Báo cáo bài viết</summary>
            <form action={reportContent} className="mt-2 flex gap-2">
              <input type="hidden" name="postId" value={post.id} />
              <input name="reason" required maxLength={500} placeholder="Lý do (spam, xúc phạm, tự hại...)" className={inputClass} />
              <Button variant="ghost">Gửi</Button>
            </form>
          </details>
        )}
      </Card>

      <section aria-label="Bình luận" className="space-y-3">
        <h2 className="font-serif text-lg font-semibold">Bình luận</h2>
        {((comments ?? []) as Comment[]).map((c) => (
          <Card key={c.id}>
            <div className="mb-1 text-xs text-muted"><span className="font-medium text-foreground">{c.nickname}</span> · {new Date(c.created_at).toLocaleString("vi-VN")}</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
            {profile && c.author_id !== profile.id && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted">Báo cáo</summary>
                <form action={reportContent} className="mt-2 flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="commentId" value={c.id} />
                  <input name="reason" required maxLength={500} placeholder="Lý do" className={inputClass} />
                  <Button variant="ghost">Gửi</Button>
                </form>
              </details>
            )}
          </Card>
        ))}
        {profile ? (
          <form action={addComment} className="flex gap-2">
            <input type="hidden" name="postId" value={post.id} />
            <label htmlFor="cm" className="sr-only">Bình luận</label>
            <textarea id="cm" name="body" rows={2} maxLength={1500} required placeholder="Chia sẻ góc nhìn nhẹ nhàng, không phán xét..." className={inputClass} />
            <Button>Gửi</Button>
          </form>
        ) : <p className="text-sm text-muted"><Link href="/dang-nhap" className="underline">Đăng nhập</Link> để bình luận.</p>}
      </section>
    </div>
  );
}
