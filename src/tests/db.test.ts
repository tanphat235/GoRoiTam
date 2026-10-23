// Integration tests against real PostgreSQL semantics (PGlite, in memory) with the real migrations.
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { consumeToken, issueToken } from "@/server/auth/tokens";
import { getDb, schema } from "@/server/db";
import { consumeGuestQuota, consumeQuota, refundQuota, usageToday } from "@/server/quota";
import { listComments, listFeed } from "@/modules/community/queries";
import { nicknameProblem } from "@/server/auth/account";
import { clientIpFrom } from "@/server/rate-limit";
import { searchTeachings } from "@/modules/ai/retrieve";

let alice: string;
let bob: string;

beforeAll(async () => {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: "./drizzle" });
  [{ id: alice }] = await db.insert(schema.users).values({ email: "alice@example.com", passwordHash: "x", nickname: "Alice", emailVerifiedAt: new Date() }).returning({ id: schema.users.id });
  [{ id: bob }] = await db.insert(schema.users).values({ email: "bob@example.com", passwordHash: "x", nickname: "Bob", emailVerifiedAt: new Date() }).returning({ id: schema.users.id });
});

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const h = await hashPassword("mật-khẩu-đủ-dài");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("mật-khẩu-đủ-dài", h)).toBe(true);
    expect(await verifyPassword("sai", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("quota", () => {
  it("never exceeds the daily limit, even with parallel requests", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => consumeQuota(alice, "free", "ai")));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect((await usageToday(alice)).ai).toBe(2);
  });
  it("refund gives one call back", async () => {
    await refundQuota(alice, "ai");
    expect(await consumeQuota(alice, "free", "ai")).toBe(true);
    expect(await consumeQuota(alice, "free", "ai")).toBe(false);
  });
  it("keeps users and kinds separate", async () => {
    expect(await consumeQuota(bob, "free", "ai")).toBe(true);
    expect(await consumeQuota(alice, "free", "post")).toBe(true);
  });
  it("limits guests per key", async () => {
    expect(await consumeGuestQuota("k1", 1)).toBe(true);
    expect(await consumeGuestQuota("k1", 1)).toBe(false);
    expect(await consumeGuestQuota("k2", 1)).toBe(true);
  });
});

describe("email tokens", () => {
  it("are single use and purpose-bound", async () => {
    const t = await issueToken(alice, "verify");
    expect(await consumeToken(t, "reset")).toBeNull();
    expect((await consumeToken(t, "verify"))?.userId).toBe(alice);
    expect(await consumeToken(t, "verify")).toBeNull();
  });
  it("issuing a new token invalidates the previous one", async () => {
    const first = await issueToken(bob, "reset");
    const second = await issueToken(bob, "reset");
    expect(await consumeToken(first, "reset")).toBeNull();
    expect((await consumeToken(second, "reset"))?.userId).toBe(bob);
  });
});

describe("community feed privacy", () => {
  it("never returns the nickname of an anonymous author", async () => {
    const db = await getDb();
    await db.insert(schema.posts).values([
      { authorId: alice, title: "Bài công khai", body: "Nội dung", kind: "share" },
      { authorId: alice, title: "Bài ẩn danh", body: "Chuyện riêng", kind: "question", isAnonymous: true },
    ]);
    const feed = await listFeed({ viewerId: bob });
    const anon = feed.find((p) => p.isAnonymous)!;
    const open = feed.find((p) => !p.isAnonymous)!;
    expect(anon.nickname).toBeNull();
    expect(JSON.stringify(anon)).not.toContain("Alice");
    expect(anon.mine).toBe(false);
    expect(open.nickname).toBe("Alice");
  });
  it("hides posts of banned users", async () => {
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    await db.update(schema.users).set({ bannedAt: new Date() }).where(eq(schema.users.id, alice));
    expect(await listFeed({ viewerId: bob })).toHaveLength(0);
    await db.update(schema.users).set({ bannedAt: null }).where(eq(schema.users.id, alice));
  });
});

describe("teaching search", () => {
  it("matches Vietnamese queries regardless of accents", async () => {
    const withAccents = await searchTeachings("Mình hay nổi giận với người thân");
    const without = await searchTeachings("minh hay noi gian voi nguoi than");
    expect(withAccents.length).toBeGreaterThan(0);
    expect(without.map((c) => c.id)).toEqual(withAccents.map((c) => c.id));
    expect(withAccents.some((c) => c.locator === "Tham sân si")).toBe(true);
  });
});

describe("security fixes", () => {
  it("an anonymous author's own reply does not reveal their nickname", async () => {
    const db = await getDb();
    const [{ id: postId }] = await db.insert(schema.posts)
      .values({ authorId: alice, title: "Ẩn danh 2", body: "riêng", isAnonymous: true }).returning({ id: schema.posts.id });
    await db.insert(schema.comments).values([
      { postId, authorId: alice, body: "tác giả trả lời" },
      { postId, authorId: bob, body: "người khác trả lời" },
    ]);
    const list = await listComments(postId, bob);
    const own = list.find((c) => c.body === "tác giả trả lời")!;
    expect(own.nickname).toBeNull();
    expect(own.byAuthor).toBe(true);
    expect(JSON.stringify(list)).not.toContain("Alice");
    expect(list.find((c) => c.body === "người khác trả lời")!.nickname).toBe("Bob");
  });

  it("nicknames are unique case-insensitively and staff-like names are reserved", async () => {
    expect(await nicknameProblem("alice")).toMatch(/đã có người dùng/);
    expect(await nicknameProblem("Admin")).toMatch(/dành riêng/);
    expect(await nicknameProblem("Ẩn danh")).toMatch(/dành riêng/);
    expect(await nicknameProblem("Alice", alice)).toBeNull();
    expect(await nicknameProblem("Thiện Tâm")).toBeNull();
  });

  it("client IP comes from the proxy-appended entry, not the client-supplied one", () => {
    const h = (xff: string) => ({ get: (n: string) => (n === "x-forwarded-for" ? xff : null) });
    expect(clientIpFrom(h("6.6.6.6, 203.0.113.9"))).toBe("203.0.113.9");
    expect(clientIpFrom(h("203.0.113.9"))).toBe("203.0.113.9");
  });
});
