/** Only same-site relative paths are allowed as post-login targets (blocks open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

/** Public origin of the app. Prefer NEXT_PUBLIC_SITE_URL in production (behind proxies the Host header can be wrong). */
export function siteUrl(h: { get(name: string): string | null }) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("host") ?? "localhost:3000"}`;
}
