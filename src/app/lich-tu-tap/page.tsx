import Link from "next/link";
import { BookOpen, Check, Flame, Flower2, HandHeart, Plus, Sparkles, Sunrise } from "lucide-react";
import { Button, Card, Field, Notice, PageHeader, TextArea } from "@/components/ui";
import { addFromTemplate, deleteSchedule, saveSchedule, toggleLog } from "@/modules/practice/actions";
import { WEEKDAY_LABELS, dayInTz, isIsoDay, itemsToText, weekOf, type Item } from "@/modules/practice/logic";
import { practiceOverview } from "@/modules/practice/queries";
import { requireMember } from "@/server/auth/session";

export const metadata = { title: "Lịch tu tập" };

/** Picks an icon from the activity name so custom items still look intentional. */
function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("thiền")) return Flower2;
  if (l.includes("niệm") || l.includes("lạy")) return HandHeart;
  if (l.includes("kinh") || l.includes("đọc") || l.includes("học")) return BookOpen;
  if (l.includes("sáng") || l.includes("nguyện")) return Sunrise;
  return Sparkles;
}

const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export default async function Page({ searchParams }: { searchParams: Promise<{ ngay?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireMember("/lich-tu-tap");
  const today = dayInTz(user.timezone);
  const selected = isIsoDay(sp.ngay) && sp.ngay <= today ? sp.ngay : today;
  const week = weekOf(selected);
  const { schedules, logs, templates, streak } = await practiceOverview(user.id, today, shift(today, -400));

  const doneOn = (day: string) => new Set(logs.filter((l) => l.day === day).map((l) => `${l.scheduleId}:${l.itemKey}`));
  const done = doneOn(selected);
  const total = schedules.reduce((n, s) => n + s.items.length, 0);
  const pct = total ? Math.round((done.size / total) * 100) : 0;
  const month = new Date(`${selected}T00:00:00Z`).toLocaleDateString("vi-VN", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Kỷ luật · Thói quen · Tiến bộ" title="Lịch tu tập" sub="Mỗi ngày một chút. Đánh dấu khi bạn hoàn thành." />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}

      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <Card className="fade-up delay-1">
          <div className="mb-4 flex items-center justify-between">
            <Link href={`/lich-tu-tap?ngay=${shift(week[0], -7)}`} className="rounded-full px-3 py-1 text-muted hover:bg-primary-soft" aria-label="Tuần trước">←</Link>
            <p className="font-medium capitalize">{month}</p>
            {week[6] < today ? <Link href={`/lich-tu-tap?ngay=${shift(week[0], 7)}`} className="rounded-full px-3 py-1 text-muted hover:bg-primary-soft" aria-label="Tuần sau">→</Link> : <span className="w-9" />}
          </div>
          <ol className="grid grid-cols-7 gap-1.5 text-center">
            {week.map((d, i) => {
              const future = d > today;
              const on = d === selected;
              const any = doneOn(d).size > 0;
              const cls = `flex flex-col items-center gap-1 rounded-2xl py-2.5 text-sm transition-all ${on ? "bg-primary text-white shadow-soft dark:text-[#10170f]" : future ? "text-muted/50" : "hover:bg-primary-soft"}`;
              const inner = (
                <>
                  <span className="text-[11px] opacity-80">{WEEKDAY_LABELS[i]}</span>
                  <span className="font-semibold">{Number(d.slice(8))}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${any ? (on ? "bg-white" : "bg-primary") : "bg-transparent"}`} />
                </>
              );
              return <li key={d}>{future ? <span className={cls}>{inner}</span> : <Link href={`/lich-tu-tap?ngay=${d}`} aria-current={on ? "date" : undefined} className={cls}>{inner}</Link>}</li>;
            })}
          </ol>
        </Card>

        <Card className="fade-up delay-2 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand/40 text-accent"><Flame size={24} aria-hidden /></span>
            <div><p className="text-xs text-muted">Chuỗi ngày</p><p className="font-serif text-2xl font-semibold">{streak} ngày</p></div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted"><span>{selected === today ? "Hôm nay" : "Ngày đã chọn"}</span><span>{done.size}/{total}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <section aria-label="Các việc trong ngày" className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">{selected === today ? "Hôm nay" : new Date(`${selected}T00:00:00Z`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", timeZone: "UTC" })}</h2>
        {schedules.length === 0 && <p className="text-sm text-muted">Bạn chưa có lịch nào. Chọn một lịch mẫu bên dưới để bắt đầu.</p>}
        {schedules.map((s, si) => (
          <Card key={s.id} className={`fade-up delay-${Math.min(si + 1, 5)}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-semibold">{s.title}</h3>
              <span className="text-xs text-muted">{s.items.filter((it) => done.has(`${s.id}:${it.key}`)).length}/{s.items.length}</span>
            </div>
            <ul className="space-y-2">
              {(s.items as Item[]).map((it) => {
                const isDone = done.has(`${s.id}:${it.key}`);
                const Icon = iconFor(it.label);
                return (
                  <li key={it.key}>
                    <form action={toggleLog}>
                      <input type="hidden" name="scheduleId" value={s.id} />
                      <input type="hidden" name="key" value={it.key} />
                      <input type="hidden" name="day" value={selected} />
                      <button aria-pressed={isDone} className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${isDone ? "border-sage bg-primary-soft" : "border-border bg-surface hover:border-sage"}`}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon size={20} aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-medium ${isDone ? "text-muted line-through" : ""}`}>{it.label}</span>
                          <span className="block text-xs text-muted">{it.minutes ? `${it.minutes} phút · ` : ""}{it.time}</span>
                        </span>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${isDone ? "scale-110 border-primary bg-primary text-white dark:text-[#10170f]" : "border-border group-hover:border-sage"}`}>
                          {isDone && <Check size={15} aria-hidden strokeWidth={3} />}
                        </span>
                        <span className="sr-only">{isDone ? "Đã hoàn thành, bấm để bỏ đánh dấu" : "Đánh dấu hoàn thành"}</span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted hover:text-primary">Chỉnh sửa lịch</summary>
              <form action={saveSchedule} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <Field label="Tên lịch" name="title" defaultValue={s.title} maxLength={80} required />
                <TextArea label="Các việc (mỗi dòng: giờ nội dung | số phút)" name="items" defaultValue={itemsToText(s.items as Item[])} rows={Math.max(3, s.items.length + 1)} />
                <div className="flex gap-2"><Button size="sm">Lưu</Button></div>
              </form>
              <form action={deleteSchedule} className="mt-2"><input type="hidden" name="id" value={s.id} /><Button variant="danger" size="sm">Xóa lịch</Button></form>
            </details>
          </Card>
        ))}
      </section>

      <section aria-label="Thêm lịch" className="grid gap-4 md:grid-cols-2">
        <Card className="fade-up">
          <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold"><Plus size={18} aria-hidden /> Thêm lịch từ mẫu</h2>
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted">{t.description}</p></div>
                <form action={addFromTemplate}><input type="hidden" name="templateId" value={t.id} /><Button variant="soft" size="sm">Thêm</Button></form>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="fade-up delay-1">
          <h2 className="mb-3 font-serif text-lg font-semibold">Tự tạo lịch</h2>
          <form action={saveSchedule} className="space-y-3">
            <Field label="Tên lịch" name="title" maxLength={80} required placeholder="Ví dụ: Lịch cuối tuần" />
            <TextArea label="Các việc" name="items" rows={3} required placeholder={"06:00 Thiền buổi sáng | 15\n21:00 Niệm Phật | 10"} />
            <Button size="sm">Tạo lịch</Button>
          </form>
        </Card>
      </section>
      <p className="text-xs text-muted">Bản hiện tại chưa gửi thông báo nhắc giờ; hãy đặt báo thức theo giờ trong lịch.</p>
    </div>
  );
}
