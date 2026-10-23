import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/lich-tu-tap", "/nhat-ky", "/ho-so", "/admin", "/cong-dong/viet"];

/**
 * Cheap edge gate: no session cookie -> send to login. The real check (valid, unexpired,
 * not banned, verified) happens on the server in requireMember(), which reads the database.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PROTECTED.some((p) => path === p || path.startsWith(`${p}/`)) && !request.cookies.has("grt_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
