import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Field, Notice } from "@/components/ui";
import { chooseNickname } from "@/modules/auth/actions";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Chọn biệt danh" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (!user.emailVerified) redirect("/kiem-tra-email");
  if (user.nickname) redirect("/");
  return (
    <AuthFrame title="Chọn biệt danh" sub="Email đã được xác nhận. Đây là tên mọi người thấy trong cộng đồng; không cần dùng tên thật.">
      {error && <Notice kind="error">{error}</Notice>}
      <form action={chooseNickname} className="space-y-4">
        <Field label="Biệt danh" name="nickname" required minLength={3} maxLength={24} placeholder="Ví dụ: An Nhiên" />
        <Button size="lg" className="w-full">Bắt đầu</Button>
      </form>
    </AuthFrame>
  );
}
