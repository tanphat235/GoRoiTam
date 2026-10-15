import { Button, Card, Notice, PageTitle, inputClass } from "@/components/ui";
import { deleteAccount, updateProfile } from "@/modules/auth/actions";
import { requireProfile } from "@/modules/auth/session";

export const metadata = { title: "Hồ sơ" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  const { data: usage } = await supabase.from("usage_daily").select("ai_count, post_count").eq("day", new Date().toISOString().slice(0, 10)).maybeSingle();
  const premium = profile.plan === "premium";
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageTitle title="Hồ sơ & quyền riêng tư" />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.ok && <Notice kind="ok">Đã lưu.</Notice>}

      <Card className="space-y-3">
        <p className="text-sm text-muted">Email: {user.email}</p>
        <form action={updateProfile} className="flex gap-2">
          <label htmlFor="nn" className="sr-only">Biệt danh</label>
          <input id="nn" name="nickname" defaultValue={profile.nickname} minLength={3} maxLength={24} required className={inputClass} />
          <Button>Lưu</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-serif font-semibold">Hôm nay</h2>
        <p className="mt-1 text-sm">Hỏi AI: {usage?.ai_count ?? 0}/{premium ? 30 : 2} · Bài đăng: {usage?.post_count ?? 0}/{premium ? 10 : 2}</p>
        <p className="mt-1 text-xs text-muted">Gói hiện tại: {premium ? "Premium" : "Miễn phí"}. Hạn mức làm mới mỗi ngày (giờ UTC).</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-serif font-semibold">Xóa tài khoản và toàn bộ dữ liệu</h2>
        <p className="text-sm text-muted">Xóa vĩnh viễn bài viết, bình luận, cuộc trò chuyện AI, lịch tu tập và nhật ký của bạn. Không thể hoàn tác.</p>
        <form action={deleteAccount} className="flex gap-2">
          <label htmlFor="cf" className="sr-only">Gõ XOA để xác nhận</label>
          <input id="cf" name="confirm" placeholder="Gõ XOA để xác nhận" required className={inputClass} autoComplete="off" />
          <Button variant="danger">Xóa</Button>
        </form>
      </Card>
    </div>
  );
}
