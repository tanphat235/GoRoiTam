import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Field, Notice } from "@/components/ui";
import { signUp } from "@/modules/auth/actions";

export const metadata = { title: "Đăng ký" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthFrame
      title="Bắt đầu hành trình"
      sub="Miễn phí. Email chỉ dùng để đăng nhập; cộng đồng chỉ thấy biệt danh của bạn."
      footer={<>Đã có tài khoản? <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Đăng nhập</Link></>}
    >
      {error && <Notice kind="error">{error}</Notice>}
      <form action={signUp} className="space-y-4">
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Mật khẩu" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" hint="Tối thiểu 8 ký tự." />
        <Button size="lg" className="w-full">Tạo tài khoản</Button>
        <p className="text-xs text-muted">
          Khi đăng ký, bạn đồng ý với <Link href="/terms" className="underline">Điều khoản</Link> và{" "}
          <Link href="/privacy" className="underline">Chính sách quyền riêng tư</Link>.
        </p>
      </form>
    </AuthFrame>
  );
}
