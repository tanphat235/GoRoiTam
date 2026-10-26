import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Field, Notice } from "@/components/ui";
import { signIn } from "@/modules/auth/actions";
import { safeNext } from "@/modules/auth/redirect";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Đăng nhập" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user?.emailVerified && user.nickname) redirect(safeNext(sp.next));
  return (
    <AuthFrame
      title="Chào mừng trở lại"
      sub="Đăng nhập để tiếp tục hành trình an lạc của bạn."
      footer={<>Chưa có tài khoản? <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">Đăng ký miễn phí</Link></>}
    >
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={safeNext(sp.next)} />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Mật khẩu" name="password" type="password" required autoComplete="current-password" />
        <div className="text-right text-sm"><Link href="/forgot-password" className="text-primary hover:underline">Quên mật khẩu?</Link></div>
        <Button size="lg" className="w-full">Đăng nhập</Button>
      </form>
    </AuthFrame>
  );
}
