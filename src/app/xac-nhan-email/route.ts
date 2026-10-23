import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/modules/auth/redirect";
import { verifyEmailToken } from "@/server/auth/account";

/** Landing point of the link in the verification email. */
export async function GET(request: NextRequest) {
  const base = siteUrl(request.headers);
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = token.length > 20 ? await verifyEmailToken(token) : { ok: false as const };
  if (!result.ok) {
    const msg = "Liên kết xác nhận đã hết hạn hoặc đã được dùng. Hãy đăng nhập để nhận liên kết mới.";
    return NextResponse.redirect(`${base}/dang-nhap?error=${encodeURIComponent(msg)}`);
  }
  // Opened in another browser/device: email is verified, now the mailbox owner sets the password.
  if (result.next.startsWith("/dat-lai-mat-khau")) return NextResponse.redirect(`${base}${result.next}&xac-nhan=1`);
  return NextResponse.redirect(`${base}${result.next}`);
}
