import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Field, Notice } from "@/components/ui";
import { resetPassword } from "@/modules/auth/actions";

export const metadata = { title: "Đặt lại mật khẩu" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string; verified?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthFrame title="Đặt mật khẩu mới" sub="Sau khi đổi, mọi thiết bị khác sẽ bị đăng xuất.">
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.verified && (
        <Notice kind="ok">
          Email đã được xác nhận. Vì liên kết được mở trên trình duyệt hoặc thiết bị khác nơi bạn đăng ký, hãy đặt mật khẩu để bảo vệ tài khoản.
        </Notice>
      )}
      {sp.token ? (
        <form action={resetPassword} className="space-y-4">
          <input type="hidden" name="token" value={sp.token} />
          <Field label="Mật khẩu mới" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" hint="Tối thiểu 8 ký tự." />
          <Button size="lg" className="w-full">Lưu mật khẩu</Button>
        </form>
      ) : (
        <p className="text-sm">Liên kết không hợp lệ. <Link href="/forgot-password" className="text-primary underline">Yêu cầu liên kết mới</Link>.</p>
      )}
    </AuthFrame>
  );
}
