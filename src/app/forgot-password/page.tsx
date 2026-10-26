import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Field, Notice } from "@/components/ui";
import { requestPasswordReset } from "@/modules/auth/actions";

export const metadata = { title: "Quên mật khẩu" };

export default async function Page({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthFrame
      title="Quên mật khẩu"
      sub="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      footer={<Link href="/login" className="text-primary hover:underline">← Quay lại đăng nhập</Link>}
    >
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.sent ? (
        <Notice kind="ok">Nếu email này có tài khoản, liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư (cả thư rác).</Notice>
      ) : (
        <form action={requestPasswordReset} className="space-y-4">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Button size="lg" className="w-full">Gửi liên kết</Button>
        </form>
      )}
    </AuthFrame>
  );
}
