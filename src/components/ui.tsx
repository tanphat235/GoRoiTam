import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]";
const variants = {
  primary: "shine bg-primary text-white shadow-soft hover:bg-primary-hover dark:text-[#10170f]",
  soft: "bg-primary-soft text-primary hover:brightness-95",
  ghost: "border border-border bg-surface text-foreground hover:border-sage hover:bg-primary-soft",
  danger: "border border-warn/60 bg-surface text-warn hover:bg-warn hover:text-white",
};
const sizes = { sm: "px-3.5 py-1.5", md: "px-5 py-2.5", lg: "px-6 py-3 text-base" };
type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export function Button({
  variant = "primary", size = "md", className = "", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function LinkButton({
  href, variant = "primary", size = "md", className = "", children,
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>{children}</Link>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-border bg-surface p-5 shadow-soft ${className}`}>{children}</div>;
}

export function PageHeader({ title, sub, eyebrow, action }: { title: string; sub?: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <header className="fade-up mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-medium text-accent">{eyebrow}</p>}
        <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-[2.1rem]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-xl text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const color =
    kind === "error" ? "border-warn/50 bg-warn/5 text-warn"
    : kind === "ok" ? "border-sage bg-primary-soft text-primary"
    : "border-border bg-surface text-muted";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`fade-up mb-4 rounded-2xl border px-4 py-3 text-sm ${color}`}>
      {children}
    </p>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-sage focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft";

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <input className={inputClass} {...props} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const area = <textarea className={inputClass} {...props} />;
  return label ? <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span>{area}</label> : area;
}

export function Chip({ children, active, href }: { children: ReactNode; active?: boolean; href?: string }) {
  const cls = `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
    active ? "border-primary bg-primary text-white dark:text-[#10170f]" : "border-border bg-surface text-foreground hover:border-sage hover:bg-primary-soft"
  }`;
  return href ? <Link href={href} className={cls} aria-current={active ? "page" : undefined}>{children}</Link> : <span className={cls}>{children}</span>;
}

export function Badge({ children, tone = "sage" }: { children: ReactNode; tone?: "sage" | "sand" | "lotus" }) {
  const t = tone === "sand" ? "bg-sand/40 text-foreground" : tone === "lotus" ? "bg-lotus/25 text-foreground" : "bg-primary-soft text-primary";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${t}`}>{children}</span>;
}

/** Initial-letter avatar; anonymous posts get a neutral lotus avatar. */
export function Avatar({ name, size = 36, avatarKey }: { name: string | null; size?: number; avatarKey?: string | null }) {
  // A photo only when there is a name: anonymous content passes name=null and never shows one.
  if (avatarKey && name) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 256px WebP served from our own route; no optimiser needed
      <img src={`/api/avatar/${avatarKey}`} alt="" aria-hidden width={size} height={size} loading="lazy" decoding="async"
        className="shrink-0 rounded-full bg-surface-2 object-cover" style={{ width: size, height: size }} />
    );
  }
  const hue = name ? [...name].reduce((h, c) => (h + c.charCodeAt(0)) % 4, 0) : -1;
  const bg = ["bg-primary", "bg-accent", "bg-[#6f8f74]", "bg-[#8a7a5c]"][hue] ?? "bg-sand";
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${bg}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name ? name.slice(0, 1).toUpperCase() : "🪷"}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="fade-up rounded-3xl border border-dashed border-border bg-surface/60 p-8 text-center">
      <p className="font-serif text-lg">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function SetupNotice() {
  return (
    <Notice kind="error">
      Chưa cấu hình database. Tạo file <code>.env.local</code> từ <code>.env.example</code> (xem README) rồi chạy lại.
    </Notice>
  );
}

export const timeAgo = (d: Date | string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(d).toLocaleDateString("vi-VN");
};
