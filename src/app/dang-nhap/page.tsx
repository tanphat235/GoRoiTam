import Link from "next/link";
import { Button, Card, Notice, PageTitle, SetupNotice, inputClass } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { signIn } from "@/modules/auth/actions";

export const metadata = { title: "Đăng nhập" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <PageTitle title="Đăng nhập" />
      {!isSupabaseConfigured() && <SetupNotice />}
      {error && <Notice kind="error">{error}</Notice>}
      <Card>
        <form action={signIn} className="space-y-3">
          <label className="block text-sm">Email<input name="email" type="email" required autoComplete="email" className={`${inputClass} mt-1`} /></label>
          <label className="block text-sm">Mật khẩu<input name="password" type="password" required minLength={8} autoComplete="current-password" className={`${inputClass} mt-1`} /></label>
          <Button className="w-full">Đăng nhập</Button>
        </form>
      </Card>
      <p className="mt-3 text-sm text-muted">Chưa có tài khoản? <Link href="/dang-ky" className="text-primary-hover underline">Đăng ký</Link></p>
    </div>
  );
}
