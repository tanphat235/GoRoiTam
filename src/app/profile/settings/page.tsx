import Link from "next/link";
import { AvatarUploader } from "@/components/avatar-uploader";
import { Button, Card, Field, Notice, PageHeader, TextArea } from "@/components/ui";
import { changePassword, deleteAccount, updateProfile } from "@/modules/auth/actions";
import { requireMember } from "@/server/auth/session";
import { LIMITS, usageToday } from "@/server/quota";

export const metadata = { title: "Cài đặt tài khoản" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const user = await requireMember("/profile/settings");
  const used = await usageToday(user.id);
  const limit = LIMITS[user.plan];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/profile" className="text-sm text-muted hover:text-primary">← Trang cá nhân</Link>
      <PageHeader title="Cài đặt tài khoản" sub={user.email} />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.ok && <Notice kind="ok">Đã lưu thay đổi.</Notice>}

      <Card className="fade-up delay-1">
        <h2 className="mb-4 font-serif text-lg font-semibold">Ảnh đại diện</h2>
        <AvatarUploader name={user.nickname} avatarKey={user.avatarKey} />
      </Card>

      <Card className="fade-up delay-1">
        <h2 className="mb-4 font-serif text-lg font-semibold">Hồ sơ</h2>
        <form action={updateProfile} className="space-y-4">
          <Field label="Biệt danh" name="nickname" defaultValue={user.nickname} minLength={3} maxLength={24} required />
          <TextArea label="Giới thiệu ngắn (tùy chọn)" name="bio" defaultValue={user.bio ?? ""} maxLength={160} rows={2} />
          <Button>Lưu hồ sơ</Button>
        </form>
      </Card>

      <Card className="fade-up delay-2">
        <h2 className="font-serif text-lg font-semibold">Hạn mức hôm nay</h2>
        <p className="mt-1 text-sm">Hỏi AI: {used.ai}/{limit.ai} · Bài đăng: {used.post}/{limit.post}</p>
        <p className="mt-1 text-xs text-muted">Gói {user.plan === "premium" ? "Premium" : "Miễn phí"}. Hạn mức làm mới mỗi ngày (giờ UTC).</p>
      </Card>

      <Card className="fade-up delay-3">
        <h2 className="mb-4 font-serif text-lg font-semibold">Đổi mật khẩu</h2>
        <form action={changePassword} className="space-y-4">
          <Field label="Mật khẩu hiện tại" name="current" type="password" required autoComplete="current-password" />
          <Field label="Mật khẩu mới" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" hint="Các thiết bị khác sẽ bị đăng xuất." />
          <Button variant="ghost">Đổi mật khẩu</Button>
        </form>
      </Card>

      <Card className="fade-up delay-4 border-warn/40">
        <h2 className="font-serif text-lg font-semibold text-warn">Xóa tài khoản</h2>
        <p className="mt-1 text-sm text-muted">Xóa vĩnh viễn bài viết, bình luận, cuộc trò chuyện AI, lịch tu tập và nhật ký. Không thể hoàn tác.</p>
        <form action={deleteAccount} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1"><Field label="Nhập mật khẩu để xác nhận" name="password" type="password" required autoComplete="current-password" /></div>
          <Button variant="danger">Xóa vĩnh viễn</Button>
        </form>
      </Card>
    </div>
  );
}
