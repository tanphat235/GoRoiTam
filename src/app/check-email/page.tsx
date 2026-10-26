import { cookies } from "next/headers";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthFrame } from "@/components/auth-frame";
import { Button, Notice } from "@/components/ui";
import { resendVerification } from "@/modules/auth/actions";

export const metadata = { title: "Kiểm tra email" };

const mask = (email: string) => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const email = (await cookies()).get("grt_pending_email")?.value;
  return (
    <AuthFrame title="Kiểm tra hộp thư" footer={<Link href="/login" className="text-primary hover:underline">← Quay lại đăng nhập</Link>}>
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.sent && <Notice kind="ok">Đã gửi lại email xác nhận.</Notice>}
      {process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST && (
        <Notice>
          Chế độ phát triển: chưa cấu hình SMTP nên email <b>không được gửi đi</b> mà được in ra cửa sổ terminal đang chạy{" "}
          <code>npm run dev</code> (khung “DEV MAIL”, dòng “Link: …”). Điền <code>SMTP_*</code> trong <code>.env.local</code> để gửi email thật.
        </Notice>
      )}
      <div className="space-y-4 text-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"><MailCheck size={26} aria-hidden /></span>
        {email ? (
          <>
            <p>Chúng tôi đã gửi liên kết xác nhận tới <b>{mask(email)}</b>. Mở email và bấm <b>Xác nhận email</b> để kích hoạt tài khoản.</p>
            <p className="text-muted">Không thấy email? Hãy kiểm tra thư rác hoặc mục Quảng cáo. Liên kết có hiệu lực 24 giờ.</p>
            <form action={resendVerification}><Button variant="ghost" className="w-full">Gửi lại email xác nhận</Button></form>
          </>
        ) : (
          <p>Phiên đã hết hạn. Hãy <Link href="/login" className="text-primary underline">đăng nhập</Link> để nhận email xác nhận mới.</p>
        )}
      </div>
    </AuthFrame>
  );
}
