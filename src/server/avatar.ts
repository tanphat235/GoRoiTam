import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp, { type Metadata } from "sharp";
import { getDb, schema } from "@/server/db";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_SIZE = 256;
const ALLOWED = new Set(["jpeg", "png", "webp"]);

export class AvatarError extends Error {}

/**
 * Turns an untrusted upload into a safe avatar: the real format is read from the bytes (never the
 * file name or MIME type), only JPEG/PNG/WebP are accepted (no SVG, which can carry scripts),
 * decompression bombs are refused, the picture is rotated upright, cropped square, resized and
 * re-encoded as WebP. Re-encoding drops all metadata, including EXIF GPS location from phone photos.
 */
export async function processAvatar(input: Uint8Array): Promise<Uint8Array> {
  if (input.byteLength === 0) throw new AvatarError("Tệp trống.");
  if (input.byteLength > AVATAR_MAX_BYTES) throw new AvatarError("Ảnh quá lớn (tối đa 2 MB).");
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new AvatarError("Tệp không phải ảnh hợp lệ.");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new AvatarError("Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
  if (!meta.width || !meta.height || meta.width < 32 || meta.height < 32) throw new AvatarError("Ảnh quá nhỏ (tối thiểu 32×32).");
  try {
    const out = await sharp(input, { limitInputPixels: 40_000_000, animated: false })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    throw new AvatarError("Không đọc được ảnh này. Hãy thử ảnh khác.");
  }
}

/** Replaces the user's avatar. A new random key per upload keeps image URLs unguessable and cache-safe. */
export async function saveAvatar(userId: string, data: Uint8Array) {
  const db = await getDb();
  const key = randomUUID();
  await db.transaction(async (tx) => {
    await tx.delete(schema.avatars).where(eq(schema.avatars.userId, userId));
    await tx.insert(schema.avatars).values({ key, userId, data });
    await tx.update(schema.users).set({ avatarKey: key }).where(eq(schema.users.id, userId));
  });
  return key;
}

export async function removeAvatar(userId: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(schema.avatars).where(eq(schema.avatars.userId, userId));
    await tx.update(schema.users).set({ avatarKey: null }).where(eq(schema.users.id, userId));
  });
}

export async function loadAvatar(key: string) {
  const db = await getDb();
  const [row] = await db.select({ data: schema.avatars.data }).from(schema.avatars).where(eq(schema.avatars.key, key));
  return row?.data ?? null;
}
