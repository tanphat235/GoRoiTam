"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/server/auth/session";
import { AVATAR_MAX_BYTES, AvatarError, processAvatar, removeAvatar, saveAvatar } from "@/server/avatar";
import { rateLimit } from "@/server/rate-limit";

export type AvatarResult = { ok: true } | { ok: false; error: string };

export async function uploadAvatar(formData: FormData): Promise<AvatarResult> {
  const user = await requireMember();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Hãy chọn một ảnh." };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, error: "Ảnh quá lớn (tối đa 2 MB)." };
  if (!(await rateLimit(`avatar:${user.id}`, 10, 3600))) return { ok: false, error: "Bạn đổi ảnh quá nhiều lần. Hãy thử lại sau." };
  try {
    const data = await processAvatar(new Uint8Array(await file.arrayBuffer()));
    await saveAvatar(user.id, data);
  } catch (e) {
    if (e instanceof AvatarError) return { ok: false, error: e.message };
    console.error("avatar upload failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Không thể lưu ảnh lúc này." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAvatar(): Promise<AvatarResult> {
  const user = await requireMember();
  await removeAvatar(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
