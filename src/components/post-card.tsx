import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { toggleReaction } from "@/modules/community/actions";
import type { FeedPost } from "@/modules/community/queries";
import { KINDS, TOPICS } from "@/modules/community/topics";
import { Avatar, Badge, timeAgo } from "./ui";

export function PostCard({ post, canReact, delay = 0 }: { post: FeedPost; canReact: boolean; delay?: number }) {
  const name = post.isAnonymous ? null : post.nickname;
  return (
    <article className={`fade-up lift rounded-3xl border border-border bg-surface p-5 shadow-soft delay-${Math.min(delay, 5)}`}>
      <div className="flex items-center gap-3">
        <Avatar name={name} avatarKey={post.avatarKey} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name ?? "Ẩn danh"}{post.mine && post.isAnonymous && <span className="ml-1 font-normal text-muted">(bạn)</span>}</p>
          <p className="text-xs text-muted"><time dateTime={new Date(post.createdAt).toISOString()}>{timeAgo(post.createdAt)}</time></p>
        </div>
        <Badge tone={post.kind === "question" ? "sand" : post.kind === "learn" ? "lotus" : "sage"}>{KINDS[post.kind].label}</Badge>
      </div>
      <Link href={`/community/${post.id}`} className="group mt-3 block">
        <h3 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary">{post.title}</h3>
        <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-muted">{post.body}</p>
      </Link>
      <div className="mt-4 flex items-center gap-2 text-sm">
        {canReact ? (
          <form action={toggleReaction}>
            <input type="hidden" name="postId" value={post.id} />
            <button aria-pressed={post.reacted} aria-label="Đồng cảm" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${post.reacted ? "bg-lotus/25 text-[#b5566a] dark:text-lotus" : "text-muted hover:bg-lotus/15"}`}>
              <Heart size={16} aria-hidden fill={post.reacted ? "currentColor" : "none"} /> {post.reactions}
            </button>
          </form>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-muted"><Heart size={16} aria-hidden /> {post.reactions}</span>
        )}
        <Link href={`/community/${post.id}#comments`} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted hover:bg-primary-soft">
          <MessageCircle size={16} aria-hidden /> {post.comments}
        </Link>
        <span className="ml-auto"><Badge tone="sand">{TOPICS[post.topic as keyof typeof TOPICS] ?? "Khác"}</Badge></span>
      </div>
    </article>
  );
}
