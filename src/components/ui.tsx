import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const variants = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  ghost: "border border-border bg-surface text-foreground hover:bg-primary-soft",
  danger: "border border-warn text-warn hover:bg-warn hover:text-white",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-surface p-4 shadow-sm ${className}`}>{children}</div>;
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-5">
      <h1 className="font-serif text-2xl font-semibold">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </header>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const color =
    kind === "error" ? "border-warn text-warn" : kind === "ok" ? "border-primary text-primary-hover" : "border-border text-muted";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`mb-4 rounded-xl border bg-surface px-3 py-2 text-sm ${color}`}>
      {children}
    </p>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary";

export function SetupNotice() {
  return (
    <Notice kind="error">
      Chưa cấu hình Supabase. Tạo file <code>.env.local</code> từ <code>.env.example</code> (xem README) rồi chạy lại.
    </Notice>
  );
}
