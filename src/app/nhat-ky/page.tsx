import { Button, Card, Notice, PageTitle, inputClass } from "@/components/ui";
import { requireProfile } from "@/modules/auth/session";
import { addJournal, deleteJournal } from "@/modules/practice/actions";

export const metadata = { title: "Nhật ký" };

const MOODS = ["😞 Rất nặng", "😕 Nặng", "😐 Bình thường", "🙂 Nhẹ nhàng", "😊 An vui"];

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile();
  const { data } = await supabase.from("journal_entries").select("id, mood, text, created_at").order("created_at", { ascending: false }).limit(50);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle title="Nhật ký tâm trạng" sub="Chỉ mình bạn thấy. Ghi lại điều đã nhận ra hôm nay." />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <Card>
        <form action={addJournal} className="space-y-3">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm">Tâm trạng của bạn</legend>
            {MOODS.map((m, i) => (
              <label key={m} className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="radio" name="mood" value={i + 1} required className="sr-only" /> {m}
              </label>
            ))}
          </fieldset>
          <textarea name="text" rows={3} maxLength={3000} required placeholder="Hôm nay mình nhận ra..." className={inputClass} aria-label="Nội dung nhật ký" />
          <Button>Lưu</Button>
        </form>
      </Card>
      <ul className="space-y-3">
        {(data ?? []).map((e) => (
          <li key={e.id}>
            <Card>
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>{MOODS[e.mood - 1]} · {new Date(e.created_at).toLocaleString("vi-VN")}</span>
                <form action={deleteJournal}><input type="hidden" name="id" value={e.id} /><button className="underline">Xóa</button></form>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{e.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
