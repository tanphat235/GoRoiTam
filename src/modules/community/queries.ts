import "server-only";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import type { Kind } from "./topics";

const { posts, users, comments, postReactions } = schema;

export type FeedPost = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  topic: string;
  isAnonymous: boolean;
  createdAt: Date;
  nickname: string | null; // always null for anonymous posts: the author never leaves the server
  reactions: number;
  comments: number;
  reacted: boolean;
  mine: boolean;
};

/** Public projection. Anonymous posts never expose author id or nickname. */
function feedSelect(viewerId: string | null) {
  return {
    id: posts.id, kind: posts.kind, title: posts.title, body: posts.body, topic: posts.topic,
    isAnonymous: posts.isAnonymous, createdAt: posts.createdAt,
    nickname: sql<string | null>`case when ${posts.isAnonymous} then null else ${users.nickname} end`,
    reactions: sql<number>`(select count(*)::int from ${postReactions} r where r.post_id = ${posts.id})`,
    comments: sql<number>`(select count(*)::int from ${comments} c where c.post_id = ${posts.id} and c.status = 'visible')`,
    reacted: viewerId
      ? sql<boolean>`exists (select 1 from ${postReactions} r where r.post_id = ${posts.id} and r.user_id = ${viewerId})`
      : sql<boolean>`false`,
    mine: viewerId ? sql<boolean>`${posts.authorId} = ${viewerId}` : sql<boolean>`false`,
  };
}

const visible = and(eq(posts.status, "visible"), isNull(users.bannedAt));

export async function listFeed(opts: { viewerId: string | null; kind?: Kind; anonymous?: boolean; limit?: number }) {
  const db = await getDb();
  const filters: (SQL | undefined)[] = [visible];
  if (opts.kind) filters.push(eq(posts.kind, opts.kind));
  if (opts.anonymous) filters.push(eq(posts.isAnonymous, true));
  return (await db
    .select(feedSelect(opts.viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt))
    .limit(opts.limit ?? 30)) as FeedPost[];
}

export async function getPost(id: string, viewerId: string | null) {
  const db = await getDb();
  const [row] = await db
    .select(feedSelect(viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(eq(posts.id, id), visible));
  return (row as FeedPost | undefined) ?? null;
}

/**
 * Comments of a post. When the post is anonymous, the author's own replies stay anonymous too
 * (nickname withheld, shown as "Tác giả"); otherwise replying would reveal who wrote the post.
 */
export async function listComments(postId: string, viewerId: string | null) {
  const db = await getDb();
  const byAuthor = sql<boolean>`${comments.authorId} = ${posts.authorId}`;
  return db
    .select({
      id: comments.id, body: comments.body, createdAt: comments.createdAt,
      nickname: sql<string | null>`case when ${posts.isAnonymous} and ${byAuthor} then null else ${users.nickname} end`,
      byAuthor,
      mine: viewerId ? sql<boolean>`${comments.authorId} = ${viewerId}` : sql<boolean>`false`,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(and(eq(comments.postId, postId), eq(comments.status, "visible"), isNull(users.bannedAt)))
    .orderBy(comments.createdAt);
}

/** The author's own posts, including anonymous and hidden ones (profile page). */
export async function listMyPosts(userId: string) {
  const db = await getDb();
  return db
    .select({ ...feedSelect(userId), status: posts.status })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.createdAt))
    .limit(50);
}

export async function searchPosts(q: string, viewerId: string | null) {
  const db = await getDb();
  const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return (await db
    .select(feedSelect(viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(visible, or(ilike(posts.title, pattern), ilike(posts.body, pattern))))
    .orderBy(desc(posts.createdAt))
    .limit(20)) as FeedPost[];
}
