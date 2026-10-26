import { Lock } from "lucide-react";
import { Button, Card, EmptyState, Notice, PageHeader, TextArea } from "@/components/ui";
import { addJournal, deleteJournal } from "@/modules/practice/actions";
import { MOODS } from "@/modules/practice/moods";
import { listJournal } from "@/modules/practice/queries";
import { requireMember } from "@/server/auth/session";

export const metadata = { title: "Nhật ký tâm" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const user = await requireMember("/journal");
  const entries = await listJournal(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Ghi lại · Nhìn lại · Chuyển hóa" title="Nhật ký tâm" sub="Chỉ mình bạn thấy những gì viết ở đây." />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <Card className="fade-up delay-1">
        <form action={addJournal} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Hôm nay tâm bạn thế nào?</legend>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m, i) => (
                <label key={m.label} className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-border p-2.5 text-xs transition-all hover:border-sage has-[:checked]:scale-105 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                  <input type="radio" name="mood" value={i + 1} required className="sr-only" />
                  <span className="text-2xl" aria-hidden>{m.emoji}</span>{m.label}
                </label>
              ))}
            </div>
          </fieldset>
          <TextArea name="text" rows={4} maxLength={3000} required placeholder="Hôm nay mình nhận ra…" aria-label="Nội dung nhật ký" />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted"><Lock size={13} aria-hidden /> Riêng tư</span>
            <Button>Lưu nhật ký</Button>
          </div>
        </form>
      </Card>
      {entries.length === 0 ? (
        <EmptyState title="Trang nhật ký còn trống">Viết vài dòng mỗi ngày giúp bạn thấy rõ tâm mình thay đổi ra sao.</EmptyState>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-border pl-6">
          {entries.map((e, i) => (
            <li key={e.id} className={`fade-up delay-${Math.min(i, 5)} relative`}>
              <span className="absolute -left-[34px] top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-surface text-sm" aria-hidden>{MOODS[e.mood - 1]?.emoji}</span>
              <Card className="!p-4">
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>{MOODS[e.mood - 1]?.label} · {e.createdAt.toLocaleString("vi-VN", { timeZone: user.timezone })}</span>
                  <form action={deleteJournal}><input type="hidden" name="id" value={e.id} /><button className="hover:text-warn">Xóa</button></form>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed">{e.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
