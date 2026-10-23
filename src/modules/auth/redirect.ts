/** Only same-site relative paths are allowed as post-login targets (blocks open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

/**
 * Public origin of the app, used in email links and redirects.
 * Production MUST set NEXT_PUBLIC_SITE_URL: the Host header is client-controlled, and trusting it
 * would let an attacker make password-reset emails point at their own domain.
 */
export function siteUrl(h: { get(name: string): string | null }) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_SITE_URL must be set in production");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("host") ?? "localhost:3000"}`;
}
