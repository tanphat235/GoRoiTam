import { NextResponse, type NextRequest } from "next/server";
import { verifyEmailToken } from "@/modules/auth/actions";
import { siteUrl } from "@/modules/auth/redirect";

/** Landing point of the link in the verification email. */
export async function GET(request: NextRequest) {
  const base = siteUrl(request.headers);
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const ok = token.length > 20 && (await verifyEmailToken(token));
  if (!ok) {
    const msg = "Liên kết xác nhận đã hết hạn hoặc đã được dùng. Hãy đăng nhập để nhận liên kết mới.";
    return NextResponse.redirect(`${base}/dang-nhap?error=${encodeURIComponent(msg)}`);
  }
  return NextResponse.redirect(`${base}/chon-biet-danh`);
}
