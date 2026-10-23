"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, CalendarCheck2, Home, MessageCircleHeart, UserRound, Users } from "lucide-react";

const SIDE = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/hoi", label: "Hỏi AI", icon: MessageCircleHeart },
  { href: "/cong-dong", label: "Cộng đồng", icon: Users },
  { href: "/lich-tu-tap", label: "Lịch tu tập", icon: CalendarCheck2 },
  { href: "/nhat-ky", label: "Nhật ký", icon: BookHeart },
];
const BOTTOM = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/hoi", label: "Hỏi AI", icon: MessageCircleHeart },
  { href: "/cong-dong", label: "Cộng đồng", icon: Users },
  { href: "/lich-tu-tap", label: "Lịch", icon: CalendarCheck2 },
  { href: "/ho-so", label: "Tài khoản", icon: UserRound },
];

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  if (variant === "bottom") {
    return BOTTOM.map(({ href, label, icon: Icon }) => {
      const on = active(href);
      return (
        <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors ${on ? "font-semibold text-primary" : "text-muted"}`}>
          <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-primary-soft" : ""}`}><Icon size={20} aria-hidden /></span>
          {label}
        </Link>
      );
    });
  }
  return SIDE.map(({ href, label, icon: Icon }) => {
    const on = active(href);
    return (
      <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] transition-all ${on ? "bg-primary-soft font-semibold text-primary" : "text-foreground hover:bg-surface-2 hover:pl-4"}`}>
        <Icon size={19} aria-hidden className={on ? "" : "text-muted group-hover:text-primary"} /> {label}
      </Link>
    );
  });
}
