import Link from "next/link";
import { BookOpenCheck, Home, MessageCircleHeart, Sprout, Users } from "lucide-react";
import { signOut } from "@/modules/auth/actions";
import { getSession } from "@/modules/auth/session";

const NAV = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/hoi", label: "Hỏi AI", icon: MessageCircleHeart },
  { href: "/cong-dong", label: "Cộng đồng", icon: Users },
  { href: "/lich-tu-tap", label: "Lịch tu tập", icon: Sprout },
  { href: "/nhat-ky", label: "Nhật ký", icon: BookOpenCheck },
];

export async function Shell({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border p-4 md:flex">
        <Link href="/" className="mb-6 font-serif text-xl font-semibold text-primary-hover">
          Gỡ Rối Tâm
        </Link>
        <nav aria-label="Chính" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-primary-soft">
              <Icon size={18} aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <Account profile={profile} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link href="/" className="font-serif text-lg font-semibold text-primary-hover">
            Gỡ Rối Tâm
          </Link>
          <Account profile={profile} compact />
        </header>
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
        <footer className="px-4 pb-24 text-xs text-muted md:px-8 md:pb-6">
          <Link href="/quyen-rieng-tu" className="underline">Quyền riêng tư</Link> ·{" "}
          <Link href="/dieu-khoan" className="underline">Điều khoản</Link>
        </footer>
      </div>

      <nav aria-label="Chính (di động)" className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-border bg-surface py-1 md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px]">
            <Icon size={20} aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Account({ profile, compact }: { profile: { nickname: string; role: string } | null; compact?: boolean }) {
  if (!profile) {
    return (
      <div className="flex gap-2">
        <Link href="/dang-nhap" className="rounded-full border border-border px-3 py-1 text-sm">Đăng nhập</Link>
        {!compact && <Link href="/dang-ky" className="rounded-full bg-primary px-3 py-1 text-sm text-white">Đăng ký</Link>}
      </div>
    );
  }
  return (
    <div className={compact ? "flex items-center gap-2 text-sm" : "space-y-2 text-sm"}>
      <Link href="/ho-so" className="block font-medium underline-offset-2 hover:underline">{profile.nickname}</Link>
      {profile.role !== "user" && <Link href="/admin" className="block text-primary-hover underline">Quản trị</Link>}
      <form action={signOut}>
        <button className="text-muted underline">Đăng xuất</button>
      </form>
    </div>
  );
}
