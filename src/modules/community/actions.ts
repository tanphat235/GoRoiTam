"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { consumeQuota, refundQuota } from "@/server/quota";
import { rateLimit } from "@/server/rate-limit";
import { KINDS, TOPICS } from "./topics";

const Id = z.string().uuid();
const fail = (path: string, msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

const PostInput = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(1).max(5000),
  kind: z.enum(Object.keys(KINDS) as [keyof typeof KINDS]),
  topic: z.enum(Object.keys(TOPICS) as [keyof typeof TOPICS]),
  anonymous: z.boolean(),
});

export async function createPost(formData: FormData) {
  const user = await requireMember();
  const parsed = PostInput.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    kind: formData.get("kind") || "share",
    topic: formData.get("topic") || "khac",
    anonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) fail("/community/new", "Tiêu đề 3-120 ký tự, nội dung 1-5000 ký tự.");
  const db = await getDb();
  const p = schema.posts;
  const [dupe] = await db.select({ id: p.id }).from(p)
    .where(and(eq(p.authorId, user.id), eq(p.body, parsed.data!.body), gt(p.createdAt, new Date(Date.now() - 86_400_000))));
  if (dupe) fail("/community/new", "Bạn vừa đăng nội dung này rồi.");
  if (!(await consumeQuota(user.id, user.plan, "post"))) fail("/community/new", "Bạn đã đăng đủ số bài hôm nay. Mai quay lại nhé.");
  let id: string;
  try {
    const { anonymous, ...rest } = parsed.data!;
    [{ id }] = await db.insert(p).values({ ...rest, isAnonymous: anonymous, authorId: user.id }).returning({ id: p.id });
  } catch (e) {
    await refundQuota(user.id, "post");
    throw e;
  }
  revalidatePath("/community");
  redirect(`/community/${id}`);
}

export async function toggleReaction(formData: FormData) {
  const user = await requireMember();
  const postId = Id.parse(formData.get("postId"));
  const db = await getDb();
  const r = schema.postReactions;
  const removed = await db.delete(r).where(and(eq(r.postId, postId), eq(r.userId, user.id))).returning({ p: r.postId });
  if (removed.length === 0) {
    const [post] = await db.select({ id: schema.posts.id }).from(schema.posts).where(and(eq(schema.posts.id, postId), eq(schema.posts.status, "visible")));
    if (post) await db.insert(r).values({ postId, userId: user.id }).onConflictDoNothing();
  }
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
}

export async function addComment(formData: FormData) {
  const user = await requireMember();
  const postId = Id.parse(formData.get("postId"));
  const path = `/community/${postId}`;
  const body = z.string().trim().min(1).max(1500).safeParse(formData.get("body"));
  if (!body.success) fail(path, "Bình luận 1-1500 ký tự.");
  if (!(await rateLimit(`comment:${user.id}`, 20, 3600))) fail(path, "Bạn bình luận quá nhanh. Hãy nghỉ một chút.");
  const db = await getDb();
  const [post] = await db.select({ id: schema.posts.id }).from(schema.posts).where(and(eq(schema.posts.id, postId), eq(schema.posts.status, "visible")));
  if (!post) fail("/community", "Bài viết không còn tồn tại.");
  await db.insert(schema.comments).values({ postId, authorId: user.id, body: body.data! });
  revalidatePath(path);
  redirect(`${path}#comments`);
}

const AUTO_HIDE_AT = 3;

export async function report(formData: FormData) {
  const user = await requireMember();
  const postId = Id.parse(formData.get("postId"));
  const commentId = formData.get("commentId") ? Id.parse(formData.get("commentId")) : null;
  const path = `/community/${postId}`;
  const reason = z.string().trim().min(3).max(500).safeParse(formData.get("reason"));
  if (!reason.success) fail(path, "Hãy ghi lý do báo cáo (ít nhất 3 ký tự).");
  const db = await getDb();
  const r = schema.reports;
  const inserted = await db.insert(r)
    .values({ postId: commentId ? null : postId, commentId, reporterId: user.id, reason: reason.data! })
    .onConflictDoNothing()
    .returning({ id: r.id });
  if (inserted.length === 0) fail(path, "Bạn đã báo cáo mục này rồi.");

  // Several independent reports hide the content until a moderator reviews it.
  const target = commentId ? eq(r.commentId, commentId) : eq(r.postId, postId);
  const open = await db.select({ id: r.id }).from(r).where(and(target, eq(r.status, "open")));
  if (open.length >= AUTO_HIDE_AT) {
    if (commentId) await db.update(schema.comments).set({ status: "hidden" }).where(eq(schema.comments.id, commentId));
    else await db.update(schema.posts).set({ status: "hidden" }).where(eq(schema.posts.id, postId));
  }
  redirect(`${path}?ok=${encodeURIComponent("Cảm ơn bạn, báo cáo đã được gửi tới đội ngũ kiểm duyệt.")}`);
}

export async function deleteOwnPost(formData: FormData) {
  const user = await requireMember();
  const postId = Id.parse(formData.get("postId"));
  const db = await getDb();
  await db.delete(schema.posts).where(and(eq(schema.posts.id, postId), eq(schema.posts.authorId, user.id)));
  revalidatePath("/community");
  redirect("/community");
}

export async function deleteOwnComment(formData: FormData) {
  const user = await requireMember();
  const postId = Id.parse(formData.get("postId"));
  const commentId = Id.parse(formData.get("commentId"));
  const db = await getDb();
  await db.delete(schema.comments).where(and(eq(schema.comments.id, commentId), eq(schema.comments.authorId, user.id)));
  revalidatePath(`/community/${postId}`);
}
