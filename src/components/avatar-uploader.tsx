"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { deleteAvatar, uploadAvatar } from "@/modules/profile/actions";
import { Avatar } from "./ui";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Downscales the picked photo in the browser first (phone photos are often 5-10 MB), so the upload
 * stays small. The server still validates and re-encodes everything; this step is only for speed.
 */
async function shrink(file: File, max = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.9));
}

/** Shared upload/remove flow for the settings card and the quick edit on the profile avatar. */
function useAvatarUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const pick = (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    if (!ACCEPT.split(",").includes(file.type)) {
      setMessage({ kind: "error", text: "Chỉ nhận ảnh JPEG, PNG hoặc WebP." });
      return;
    }
    start(async () => {
      try {
        const blob = await shrink(file);
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        const fd = new FormData();
        fd.set("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        const res = await uploadAvatar(fd);
        if (res.ok) {
          setMessage({ kind: "ok", text: "Đã cập nhật ảnh đại diện." });
          router.refresh();
        } else {
          setPreview(null);
          setMessage({ kind: "error", text: res.error });
        }
      } catch {
        setPreview(null);
        setMessage({ kind: "error", text: "Không đọc được ảnh này. Hãy thử ảnh khác." });
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  const remove = () =>
    start(async () => {
      await deleteAvatar();
      setPreview(null);
      setMessage({ kind: "ok", text: "Đã xóa ảnh đại diện." });
      router.refresh();
    });

  return { input, preview, message, pending, pick, remove };
}

function Face({ name, avatarKey, preview, size }: { name: string; avatarKey: string | null; preview: string | null; size: number }) {
  return preview ? (
    // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimisable asset
    <img src={preview} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <Avatar name={name} avatarKey={avatarKey} size={size} />
  );
}

/** Settings card: preview, upload/change and remove buttons, with an explanation. */
export function AvatarUploader({ name, avatarKey }: { name: string; avatarKey: string | null }) {
  const { input, preview, message, pending, pick, remove } = useAvatarUpload();
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative">
        <Face name={name} avatarKey={avatarKey} preview={preview} size={88} />
        {pending && <span className="absolute inset-0 animate-pulse rounded-full bg-surface/60" aria-hidden />}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover dark:text-[#10170f] ${pending ? "pointer-events-none opacity-60" : ""}`}>
            <Camera size={16} aria-hidden /> {avatarKey || preview ? "Đổi ảnh" : "Tải ảnh lên"}
            <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={pending} />
          </label>
          {(avatarKey || preview) && (
            <button type="button" onClick={remove} disabled={pending} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-warn hover:text-warn disabled:opacity-60">
              <Trash2 size={15} aria-hidden /> Xóa ảnh
            </button>
          )}
        </div>
        <p className="text-xs text-muted">JPEG, PNG hoặc WebP. Ảnh được cắt vuông và xóa mọi thông tin ẩn (vị trí GPS, thiết bị chụp). Bài đăng ẩn danh không bao giờ hiện ảnh này.</p>
        {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-warn" : "text-primary"}`}>{message.text}</p>}
      </div>
    </div>
  );
}

/** Profile header: the avatar itself is the button. Click (or tap) it to pick a new photo. */
export function AvatarQuickEdit({ name, avatarKey, size = 92 }: { name: string; avatarKey: string | null; size?: number }) {
  const { input, preview, message, pending, pick } = useAvatarUpload();
  return (
    <div className="relative z-10">
      <label
        className="group relative block cursor-pointer rounded-full border-4 border-surface shadow-soft focus-within:ring-4 focus-within:ring-primary/30"
        title={avatarKey ? "Đổi ảnh đại diện" : "Thêm ảnh đại diện"}
      >
        <Face name={name} avatarKey={avatarKey} preview={preview} size={size} />
        <span aria-hidden className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
          <Camera size={size * 0.28} />
        </span>
        <span aria-hidden className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-white shadow-soft dark:text-[#10170f]">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
        </span>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label={avatarKey ? "Đổi ảnh đại diện" : "Thêm ảnh đại diện"}
          onChange={(e) => pick(e.target.files?.[0])}
          disabled={pending}
        />
      </label>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`absolute left-0 top-full mt-2 w-64 text-xs ${message.kind === "error" ? "text-warn" : "text-primary"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
