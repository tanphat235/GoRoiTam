import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'" + (isDev ? " ws:" : ""),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Native/WASM database drivers must not be bundled by webpack.
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "sharp"],
  // Avatar uploads (already downscaled in the browser; the server caps them at 2 MB).
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Old Vietnamese URLs (bookmarks, links in emails already sent) keep working.
  async redirects() {
    const moved: [string, string][] = [
      ["/cong-dong/viet", "/community/new"], ["/cong-dong", "/community"], ["/ho-so/cai-dat", "/profile/settings"],
      ["/ho-so", "/profile"], ["/hoi", "/ask"], ["/lich-tu-tap", "/practice"], ["/nhat-ky", "/journal"],
      ["/dang-nhap", "/login"], ["/dang-ky", "/signup"], ["/kiem-tra-email", "/check-email"],
      ["/quen-mat-khau", "/forgot-password"], ["/dat-lai-mat-khau", "/reset-password"], ["/chon-biet-danh", "/choose-nickname"],
      ["/xac-nhan-email", "/verify-email"], ["/tim-kiem", "/search"], ["/quyen-rieng-tu", "/privacy"], ["/dieu-khoan", "/terms"],
    ];
    return moved.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: true },
      { source: `${from}/:rest*`, destination: `${to}/:rest*`, permanent: true },
    ]);
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Production is served over HTTPS only; browsers must never downgrade.
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
