import { redirect } from "next/navigation";
import { Button, Card, Notice, PageTitle, inputClass } from "@/components/ui";
import { createProfile } from "@/modules/auth/actions";
import { getSession } from "@/modules/auth/session";

export const metadata = { title: "Chọn biệt danh" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user, profile } = await getSession();
  if (!user) redirect("/dang-nhap");
  if (profile) redirect("/");
  return (
    <div className="mx-auto max-w-sm">
      <PageTitle title="Chọn biệt danh" sub="Đây là tên mọi người thấy trong cộng đồng. Đừng dùng tên thật nếu bạn muốn kín đáo." />
      {error && <Notice kind="error">{error}</Notice>}
      <Card>
        <form action={createProfile} className="space-y-3">
          <input type="hidden" name="timezone" value="Asia/Ho_Chi_Minh" />
          <label className="block text-sm">Biệt danh<input name="nickname" required minLength={3} maxLength={24} className={`${inputClass} mt-1`} /></label>
          <Button className="w-full">Bắt đầu</Button>
        </form>
      </Card>
    </div>
  );
}
