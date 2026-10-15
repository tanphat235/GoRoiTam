import Link from "next/link";
import { Card, LinkButton, Notice, SetupNotice, inputClass } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSession } from "@/modules/auth/session";

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const sp = await searchParams;
  const { profile } = await getSession();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {!isSupabaseConfigured() && <SetupNotice />}
      {sp.deleted && <Notice kind="ok">Tài khoản và dữ liệu của bạn đã được xóa.</Notice>}

      <section>
        <h1 className="font-serif text-3xl font-semibold leading-tight">
          {profile ? `Chào ${profile.nickname}, hôm nay tâm bạn thế nào?` : "Chuyện gì đang làm bạn rối lòng?"}
        </h1>
        <p className="mt-2 text-muted">Kể cho mình nghe. Mình sẽ cùng bạn nhìn lại bằng góc nhìn Phật pháp và gợi ý một việc nhỏ để thực hành.</p>
        <form action="/hoi" className="mt-4 space-y-3">
          <label htmlFor="q" className="sr-only">Vấn đề bạn đang gặp</label>
          <textarea id="q" name="q" rows={3} maxLength={2000} required placeholder="Ví dụ: Mình hay nổi giận với người thân rồi lại hối hận..." className={inputClass} />
          <button className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover">Hỏi Gỡ Rối Tâm</button>
          {!profile && <p className="text-xs text-muted">Thử ngay không cần đăng ký (1 lượt). Đăng ký miễn phí để lưu lịch sử và dùng lịch tu tập.</p>}
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Ba khu vực chính">
        <Card><h2 className="font-serif font-semibold">Hỏi AI</h2><p className="mt-1 text-sm text-muted">Thấu hiểu, góc nhìn Phật pháp, việc nên thực hành, nguồn tham khảo.</p><Link href="/hoi" className="mt-2 inline-block text-sm text-primary-hover underline">Bắt đầu</Link></Card>
        <Card><h2 className="font-serif font-semibold">Cộng đồng</h2><p className="mt-1 text-sm text-muted">Chia sẻ bằng biệt danh hoặc ẩn danh, nhận sự đồng cảm.</p><Link href="/cong-dong" className="mt-2 inline-block text-sm text-primary-hover underline">Xem bảng tin</Link></Card>
        <Card><h2 className="font-serif font-semibold">Lịch tu tập</h2><p className="mt-1 text-sm text-muted">Thiền, niệm Phật, đọc kinh theo giờ của bạn, có theo dõi chuỗi ngày.</p><Link href="/lich-tu-tap" className="mt-2 inline-block text-sm text-primary-hover underline">Lập lịch</Link></Card>
      </section>

      {!profile && (
        <div className="flex gap-2">
          <LinkButton href="/dang-ky">Đăng ký miễn phí</LinkButton>
          <LinkButton href="/dang-nhap" variant="ghost">Đăng nhập</LinkButton>
        </div>
      )}
      <p className="text-xs text-muted">Gỡ Rối Tâm là công cụ hỗ trợ, không thay thế bác sĩ hay chuyên gia tâm lý. Nếu bạn đang gặp nguy hiểm, hãy liên hệ ngay người thân hoặc cơ sở y tế gần nhất.</p>
    </div>
  );
}
