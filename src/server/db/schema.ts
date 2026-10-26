import { sql } from "drizzle-orm";
import {
  bigserial, boolean, check, customType, date, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, unique, uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const bytea = customType<{ data: Uint8Array }>({ dataType: () => "bytea" });
const tz = (name: string) => timestamp(name, { withTimezone: true });

/** Vietnamese accent folding inside Postgres. translate() is IMMUTABLE, so it can feed a generated column. */
export const VI_FROM = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
export const VI_TO = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";

// ---------- accounts ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: tz("email_verified_at"),
  nickname: text("nickname").unique(),
  bio: text("bio"),
  role: text("role", { enum: ["user", "moderator", "admin"] }).notNull().default("user"),
  plan: text("plan", { enum: ["free", "premium"] }).notNull().default("free"),
  timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
  bannedAt: tz("banned_at"),
  // Random key of the current avatar image (not the user id), so the image URL never reveals who someone is.
  avatarKey: text("avatar_key"),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token; the raw token is never stored
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: tz("expires_at").notNull(),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const emailTokens = pgTable("email_tokens", {
  id: text("id").primaryKey(), // sha256 of the emailed token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["verify", "reset"] }).notNull(),
  expiresAt: tz("expires_at").notNull(),
  usedAt: tz("used_at"),
  // Signup only: the password chosen in THIS signup, applied on verification only when the link is
  // opened in the same browser (nonce cookie). Stops anyone pre-registering someone else's email.
  passwordHash: text("password_hash"),
  nonceHash: text("nonce_hash"),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: tz("window_start").notNull(),
  count: integer("count").notNull().default(0),
});

/** Avatar images, already resized and re-encoded server-side (WebP, metadata stripped). */
export const avatars = pgTable("avatars", {
  key: text("key").primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  createdAt: tz("created_at").notNull().defaultNow(),
});

// ---------- community ----------
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["question", "share", "learn"] }).notNull().default("share"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  topic: text("topic").notNull().default("khac"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: text("status", { enum: ["visible", "hidden"] }).notNull().default("visible"),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [
  index("posts_feed_idx").on(t.status, t.createdAt),
  index("posts_author_idx").on(t.authorId),
  check("posts_title_len", sql`char_length(${t.title}) between 1 and 120`),
  check("posts_body_len", sql`char_length(${t.body}) between 1 and 5000`),
]);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  status: text("status", { enum: ["visible", "hidden"] }).notNull().default("visible"),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [index("comments_post_idx").on(t.postId, t.createdAt), check("comments_body_len", sql`char_length(${t.body}) between 1 and 1500`)]);

export const postReactions = pgTable("post_reactions", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.postId, t.userId] })]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["open", "dismissed", "actioned"] }).notNull().default("open"),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [
  unique("reports_once").on(t.postId, t.commentId, t.reporterId).nullsNotDistinct(),
  check("reports_target", sql`(${t.postId} is not null) <> (${t.commentId} is not null)`),
]);

// ---------- quota ----------
export const usageDaily = pgTable("usage_daily", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  aiCount: integer("ai_count").notNull().default(0),
  postCount: integer("post_count").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.userId, t.day] })]);

export const guestUsage = pgTable("guest_usage", {
  keyHash: text("key_hash").notNull(),
  day: date("day").notNull(),
  aiCount: integer("ai_count").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.keyHash, t.day] })]);

// ---------- AI ----------
export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [index("ai_conv_user_idx").on(t.userId, t.createdAt)]);

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources").notNull().default([]),
  flags: jsonb("flags").notNull().default({}),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [index("ai_msg_conv_idx").on(t.conversationId, t.createdAt)]);

export const teachingSources = pgTable("teaching_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  tradition: text("tradition").notNull().default("dai-thua"),
  translator: text("translator"),
  notes: text("notes"),
  verified: boolean("verified").notNull().default(false),
});

export const teachingChunks = pgTable("teaching_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => teachingSources.id, { onDelete: "cascade" }),
  locator: text("locator"),
  text: text("text").notNull(),
  tsv: tsvector("tsv").generatedAlwaysAs(
    sql.raw(`to_tsvector('simple', translate(lower(coalesce(locator,'') || ' ' || text), '${VI_FROM}', '${VI_TO}'))`),
  ),
}, (t) => [index("teaching_tsv_idx").using("gin", t.tsv)]);

// ---------- practice ----------
export type PracticeItem = { key: string; time: string; label: string; minutes?: number };

export const practiceTemplates = pgTable("practice_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  items: jsonb("items").$type<PracticeItem[]>().notNull(),
});

export const practiceSchedules = pgTable("practice_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  items: jsonb("items").$type<PracticeItem[]>().notNull().default([]),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const practiceLogs = pgTable("practice_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scheduleId: uuid("schedule_id").notNull().references(() => practiceSchedules.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  itemKey: text("item_key").notNull(),
  doneAt: tz("done_at").notNull().defaultNow(),
}, (t) => [unique("practice_logs_once").on(t.userId, t.scheduleId, t.day, t.itemKey), index("practice_logs_user_day").on(t.userId, t.day)]);

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mood: smallint("mood").notNull(),
  text: text("text").notNull(),
  createdAt: tz("created_at").notNull().defaultNow(),
}, (t) => [check("journal_mood", sql`${t.mood} between 1 and 5`), index("journal_user_idx").on(t.userId, t.createdAt)]);

// ---------- audit ----------
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  target: text("target"),
  at: tz("at").notNull().defaultNow(),
});
