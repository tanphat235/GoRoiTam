import Link from "next/link";
import { Button, Card, Notice, PageTitle, SetupNotice, inputClass } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { signUp } from "@/modules/auth/actions";

export const metadata = { title: "Đăng ký" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <PageTitle title="Đăng ký miễn phí" sub="Email chỉ dùng để đăng nhập. Cộng đồng chỉ thấy biệt danh của bạn." />
      {!isSupabaseConfigured() && <SetupNotice />}
      {error && <Notice kind="error">{error}</Notice>}
      <Card>
        <form action={signUp} className="space-y-3">
          <label className="block text-sm">Email<input name="email" type="email" required autoComplete="email" className={`${inputClass} mt-1`} /></label>
          <label className="block text-sm">Mật khẩu (tối thiểu 8 ký tự)<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={`${inputClass} mt-1`} /></label>
          <Button className="w-full">Tạo tài khoản</Button>
        </form>
      </Card>
      <p className="mt-3 text-sm text-muted">Đã có tài khoản? <Link href="/dang-nhap" className="text-primary-hover underline">Đăng nhập</Link></p>
    </div>
  );
}
