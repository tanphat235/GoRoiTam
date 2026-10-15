import { Button, Card, Notice, PageTitle, inputClass } from "@/components/ui";
import { requireProfile } from "@/modules/auth/session";
import { createFromTemplate, deleteSchedule, saveSchedule, toggleLog } from "@/modules/practice/actions";
import { computeStreak, dayInTz, itemsToText, type Item } from "@/modules/practice/logic";

export const metadata = { title: "Lịch tu tập" };

type Schedule = { id: string; title: string; items: Item[] };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireProfile();
  const today = dayInTz(profile.timezone);

  const [{ data: schedules }, { data: templates }, { data: todayLogs }, { data: recent }] = await Promise.all([
    supabase.from("practice_schedules").select("id, title, items").order("created_at"),
    supabase.from("practice_templates").select("id, name, description"),
    supabase.from("practice_logs").select("schedule_id, item_key").eq("day", today),
    supabase.from("practice_logs").select("day").gte("day", new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10)),
  ]);
  const done = new Set((todayLogs ?? []).map((l) => `${l.schedule_id}:${l.item_key}`));
  const streak = computeStreak((recent ?? []).map((r) => r.day as string), today);
  const list = (schedules ?? []) as Schedule[];
  const total = list.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle title="Lịch tu tập của tôi" sub="Kỷ luật nhẹ nhàng, mỗi ngày một chút." />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}

      <Card className="flex items-center justify-between">
        <div><p className="text-xs text-muted">Chuỗi ngày thực hành</p><p className="font-serif text-2xl font-semibold">{streak} ngày</p></div>
        <div className="text-right"><p className="text-xs text-muted">Hôm nay</p><p className="font-medium">{done.size}/{total} việc</p></div>
      </Card>

      {list.map((s) => (
        <Card key={s.id} className="space-y-3">
          <h2 className="font-serif text-lg font-semibold">{s.title}</h2>
          <ul className="space-y-2">
            {s.items.map((it) => {
              const isDone = done.has(`${s.id}:${it.key}`);
              return (
                <li key={it.key}>
                  <form action={toggleLog} className="flex items-center gap-3">
                    <input type="hidden" name="scheduleId" value={s.id} />
                    <input type="hidden" name="key" value={it.key} />
                    <button aria-pressed={isDone} aria-label={`${isDone ? "Bỏ đánh dấu" : "Đánh dấu hoàn thành"}: ${it.label}`} className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${isDone ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>{isDone ? "✓" : ""}</button>
                    <span className="w-12 text-sm text-muted">{it.time}</span>
                    <span className={`text-sm ${isDone ? "text-muted line-through" : ""}`}>{it.label}</span>
                  </form>
                </li>
              );
            })}
          </ul>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Chỉnh sửa</summary>
            <form action={saveSchedule} className="mt-2 space-y-2">
              <input type="hidden" name="id" value={s.id} />
              <input name="title" defaultValue={s.title} maxLength={80} required className={inputClass} aria-label="Tên lịch" />
              <textarea name="items" defaultValue={itemsToText(s.items)} rows={Math.max(3, s.items.length + 1)} className={inputClass} aria-label="Các việc, mỗi dòng: giờ rồi nội dung" />
              <p className="text-xs text-muted">Mỗi dòng: <code>06:00 Thiền 15 phút</code></p>
              <div className="flex gap-2"><Button>Lưu</Button></div>
            </form>
            <form action={deleteSchedule} className="mt-2"><input type="hidden" name="id" value={s.id} /><Button variant="danger" className="!px-3 !py-1">Xóa lịch</Button></form>
          </details>
        </Card>
      ))}

      <section aria-label="Lịch mẫu">
        <h2 className="mb-2 font-serif text-lg font-semibold">{list.length ? "Thêm lịch mẫu" : "Bắt đầu từ một lịch mẫu"}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(templates ?? []).map((t) => (
            <Card key={t.id} className="flex flex-col gap-2">
              <p className="font-medium">{t.name}</p>
              <p className="flex-1 text-xs text-muted">{t.description}</p>
              <form action={createFromTemplate}><input type="hidden" name="templateId" value={t.id} /><Button variant="ghost" className="w-full">Dùng lịch này</Button></form>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Nhắc nhở qua thông báo chưa có ở bản đầu; hãy dùng báo thức điện thoại theo giờ trong lịch.</p>
      </section>
    </div>
  );
}
