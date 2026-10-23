import Link from "next/link";
import { EyeOff } from "lucide-react";
import { Button, Card, Field, Notice, PageHeader, TextArea, inputClass } from "@/components/ui";
import { createPost } from "@/modules/community/actions";
import { KINDS, TOPICS } from "@/modules/community/topics";
import { requireMember } from "@/server/auth/session";
import { LIMITS, usageToday } from "@/server/quota";

export const metadata = { title: "Viết bài" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const user = await requireMember("/cong-dong/viet");
  const used = await usageToday(user.id);
  const limit = LIMITS[user.plan].post;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/cong-dong" className="text-sm text-muted hover:text-primary">← Cộng đồng</Link>
      <PageHeader title="Viết bài" sub={`Hôm nay bạn đã đăng ${used.post}/${limit} bài.`} />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <Card className="fade-up delay-1">
        <form action={createPost} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Loại bài</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(KINDS).map(([k, v], i) => (
                <label key={k} className="cursor-pointer rounded-full border border-border px-4 py-1.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white dark:has-[:checked]:text-[#10170f]">
                  <input type="radio" name="kind" value={k} defaultChecked={i === 1} className="sr-only" /> {v.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Tiêu đề" name="title" required minLength={3} maxLength={120} placeholder="Ví dụ: Làm sao để buông bỏ những kỳ vọng?" />
          <TextArea label="Nội dung" name="body" required maxLength={5000} rows={7} placeholder="Chia sẻ điều bạn đang trải qua hoặc điều bạn đã nhận ra…" />
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Chủ đề</span>
              <select name="topic" className={`${inputClass} w-auto`}>
                {Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="mt-6 flex cursor-pointer items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <input type="checkbox" name="anonymous" className="accent-[var(--primary)]" />
              <EyeOff size={16} aria-hidden /> Đăng ẩn danh
            </label>
          </div>
          <p className="text-xs text-muted">Bài ẩn danh không hiển thị biệt danh của bạn với ai. Hệ thống vẫn lưu liên kết để chống lạm dụng (xem Quyền riêng tư).</p>
          <Button size="lg" className="w-full sm:w-auto">Đăng bài</Button>
        </form>
      </Card>
    </div>
  );
}
