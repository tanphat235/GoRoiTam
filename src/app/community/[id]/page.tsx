import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag, Heart, Trash2 } from "lucide-react";
import { z } from "zod";
import { Landscape } from "@/components/scenery";
import { Avatar, Badge, Button, Card, Notice, TextArea, inputClass, timeAgo } from "@/components/ui";
import { addComment, deleteOwnComment, deleteOwnPost, report, toggleReaction } from "@/modules/community/actions";
import { getPost, listComments } from "@/modules/community/queries";
import { KINDS, TOPICS } from "@/modules/community/topics";
import { getCurrentUser } from "@/server/auth/session";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const user = await getCurrentUser();
  const member = user?.emailVerified && user.nickname ? user : null;
  const post = await getPost(id, user?.id ?? null);
  if (!post) notFound();
  const comments = await listComments(id, user?.id ?? null);
  const name = post.isAnonymous ? null : post.nickname;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/community" className="text-sm text-muted hover:text-primary">← Cộng đồng</Link>
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.ok && <Notice kind="ok">{sp.ok}</Notice>}

      <article className="fade-up overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft">
        <div className="relative h-40 sm:h-52"><Landscape idp="post" className="absolute inset-0 h-full w-full" /></div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={post.kind === "question" ? "sand" : post.kind === "learn" ? "lotus" : "sage"}>{KINDS[post.kind].label}</Badge>
            <Badge tone="sand">{TOPICS[post.topic as keyof typeof TOPICS] ?? "Khác"}</Badge>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight">{post.title}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <Avatar name={name} avatarKey={post.avatarKey} size={36} />
            <div><p className="font-semibold">{name ?? "Ẩn danh"}</p><p className="text-xs text-muted">{timeAgo(post.createdAt)}</p></div>
          </div>
          <p className="mt-5 whitespace-pre-line leading-relaxed">{post.body}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
            {member ? (
              <form action={toggleReaction}>
                <input type="hidden" name="postId" value={post.id} />
                <Button variant={post.reacted ? "soft" : "ghost"} size="sm" aria-pressed={post.reacted}>
                  <Heart size={16} aria-hidden fill={post.reacted ? "currentColor" : "none"} /> Đồng cảm · {post.reactions}
                </Button>
              </form>
            ) : <span className="flex items-center gap-1.5 text-muted"><Heart size={16} aria-hidden /> {post.reactions}</span>}
            {post.mine && (
              <form action={deleteOwnPost} className="ml-auto">
                <input type="hidden" name="postId" value={post.id} />
                <Button variant="danger" size="sm"><Trash2 size={15} aria-hidden /> Xóa bài</Button>
              </form>
            )}
            {member && !post.mine && (
              <details className="ml-auto">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted hover:text-warn"><Flag size={15} aria-hidden /> Báo cáo</summary>
                <form action={report} className="mt-2 flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="reason" required minLength={3} maxLength={500} placeholder="Lý do (spam, xúc phạm, tự hại…)" className={inputClass} aria-label="Lý do báo cáo" />
                  <Button variant="ghost" size="sm">Gửi</Button>
                </form>
              </details>
            )}
          </div>
        </div>
      </article>

      <section id="comments" aria-label="Bình luận" className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Bình luận ({comments.length})</h2>
        {comments.map((c, i) => (
          <Card key={c.id} className={`fade-up delay-${Math.min(i, 5)} !p-4`}>
            <div className="flex items-start gap-3">
              <Avatar name={c.nickname} avatarKey={c.avatarKey} size={32} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-semibold">{c.nickname ?? "Ẩn danh"}</span>
                  {c.byAuthor && <Badge>Tác giả</Badge>}
                  <span className="text-xs text-muted">· {timeAgo(c.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
                <div className="mt-2 flex gap-4 text-xs">
                  {c.mine && (
                    <form action={deleteOwnComment}>
                      <input type="hidden" name="postId" value={post.id} /><input type="hidden" name="commentId" value={c.id} />
                      <button className="text-muted hover:text-warn">Xóa</button>
                    </form>
                  )}
                  {member && !c.mine && (
                    <details>
                      <summary className="cursor-pointer list-none text-muted hover:text-warn">Báo cáo</summary>
                      <form action={report} className="mt-2 flex gap-2">
                        <input type="hidden" name="postId" value={post.id} /><input type="hidden" name="commentId" value={c.id} />
                        <input name="reason" required minLength={3} maxLength={500} placeholder="Lý do" className={inputClass} aria-label="Lý do báo cáo" />
                        <Button variant="ghost" size="sm">Gửi</Button>
                      </form>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {member ? (
          <Card>
            <form action={addComment} className="space-y-3">
              <input type="hidden" name="postId" value={post.id} />
              <TextArea name="body" rows={3} required maxLength={1500} placeholder="Viết bình luận nhẹ nhàng, không phán xét…" aria-label="Bình luận" />
              <div className="flex justify-end"><Button>Gửi bình luận</Button></div>
            </form>
          </Card>
        ) : (
          <p className="text-sm text-muted"><Link href={`/login?next=/community/${post.id}`} className="text-primary underline">Đăng nhập</Link> để bình luận.</p>
        )}
      </section>
    </div>
  );
}
