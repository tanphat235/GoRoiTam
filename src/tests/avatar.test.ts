// Avatar pipeline: untrusted bytes in, safe 256px WebP out; anonymous content never exposes it.
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { listComments, listFeed } from "@/modules/community/queries";
import { AvatarError, loadAvatar, processAvatar, removeAvatar, saveAvatar } from "@/server/avatar";
import { getDb, schema } from "@/server/db";

const photo = (w = 800, h = 600) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 160, b: 110 } } })
    .jpeg()
    // Simulate a phone photo carrying camera info and a GPS position.
    .withExif({ IFD0: { Make: "PhoneMaker", Model: "Cam 1" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "10/1 46/1 0/1" } })
    .toBuffer();

let author: string;
let reader: string;

beforeAll(async () => {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: "./drizzle" });
  [{ id: author }] = await db.insert(schema.users).values({ email: "author@x.test", passwordHash: "x", nickname: "Tác Giả", emailVerifiedAt: new Date() }).returning({ id: schema.users.id });
  [{ id: reader }] = await db.insert(schema.users).values({ email: "reader@x.test", passwordHash: "x", nickname: "Người Đọc", emailVerifiedAt: new Date() }).returning({ id: schema.users.id });
});

describe("processAvatar", () => {
  it("returns a square 256px WebP with all metadata removed", async () => {
    const input = await photo();
    expect((await sharp(input).metadata()).exif).toBeDefined(); // the input really has EXIF
    const out = await processAvatar(new Uint8Array(input));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([256, 256]);
    expect(meta.exif).toBeUndefined();
    expect(Buffer.from(out).includes(Buffer.from("PhoneMaker"))).toBe(false);
  });

  it("rejects SVG, non-images, tiny images and oversized uploads", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><script>alert(1)</script></svg>');
    await expect(processAvatar(new Uint8Array(svg))).rejects.toBeInstanceOf(AvatarError);
    await expect(processAvatar(new Uint8Array(Buffer.from("<?php echo 1; ?>")))).rejects.toThrow(/không phải ảnh/);
    await expect(processAvatar(new Uint8Array(await photo(20, 20)))).rejects.toThrow(/quá nhỏ/);
    await expect(processAvatar(new Uint8Array(3 * 1024 * 1024))).rejects.toThrow(/quá lớn/);
  });
});

describe("avatar storage and privacy", () => {
  it("keeps exactly one avatar per user and serves it by a random key", async () => {
    const data = await processAvatar(new Uint8Array(await photo()));
    const k1 = await saveAvatar(author, data);
    const k2 = await saveAvatar(author, data);
    expect(k1).not.toBe(k2);
    expect(await loadAvatar(k1)).toBeNull(); // old image is gone
    expect(await loadAvatar(k2)).not.toBeNull();
    expect(k2).not.toContain(author);
    const db = await getDb();
    expect(await db.select().from(schema.avatars).where(eq(schema.avatars.userId, author))).toHaveLength(1);
  });

  it("never exposes the author's avatar on anonymous posts or their own replies there", async () => {
    const db = await getDb();
    const [{ id: postId }] = await db.insert(schema.posts)
      .values({ authorId: author, title: "Ẩn danh", body: "riêng", isAnonymous: true }).returning({ id: schema.posts.id });
    await db.insert(schema.posts).values({ authorId: author, title: "Công khai", body: "chung" });
    await db.insert(schema.comments).values({ postId, authorId: author, body: "tác giả trả lời" });
    const [{ avatarKey }] = await db.select({ avatarKey: schema.users.avatarKey }).from(schema.users).where(eq(schema.users.id, author));
    expect(avatarKey).toBeTruthy();

    const feed = await listFeed({ viewerId: reader });
    expect(feed.find((p) => p.isAnonymous)!.avatarKey).toBeNull();
    expect(feed.find((p) => !p.isAnonymous)!.avatarKey).toBe(avatarKey);
    expect(JSON.stringify(feed.filter((p) => p.isAnonymous))).not.toContain(avatarKey!);
    const comments = await listComments(postId, reader);
    expect(comments[0].avatarKey).toBeNull();
  });

  it("removing the avatar clears it everywhere", async () => {
    await removeAvatar(author);
    const db = await getDb();
    const [{ avatarKey }] = await db.select({ avatarKey: schema.users.avatarKey }).from(schema.users).where(eq(schema.users.id, author));
    expect(avatarKey).toBeNull();
    expect(await db.select().from(schema.avatars).where(eq(schema.avatars.userId, author))).toHaveLength(0);
  });
});
