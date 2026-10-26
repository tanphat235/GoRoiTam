import Link from "next/link";
import { ChevronRight, LogOut, Search, ShieldCheck } from "lucide-react";
import { signOut } from "@/modules/auth/actions";
import { getCurrentUser } from "@/server/auth/session";
import { Ambient } from "./ambient";
import { BrandMark } from "./lotus";
import { NavLinks } from "./nav-links";
import { MotionToggle, ThemeToggle } from "./theme-toggle";
import { Avatar } from "./ui";

export async function Shell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const member = user?.emailVerified && user.nickname ? user : null;
  return (
    <>
    <Ambient />
    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/70 px-4 py-6 backdrop-blur-[2px] lg:flex">
        <Brand />
        <nav aria-label="Chính" className="mt-9 flex flex-1 flex-col gap-1">
          <NavLinks variant="side" />
        </nav>
        {member ? (
          <div className="space-y-2">
            {member.role !== "user" && (
              <Link href="/admin" className="flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm text-primary hover:bg-primary-soft">
                <ShieldCheck size={17} aria-hidden /> Quản trị
              </Link>
            )}
            <Link href="/profile" className="lift flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              <Avatar name={member.nickname} avatarKey={member.avatarKey} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{member.nickname}</span>
                <span className="block text-xs text-muted">{member.role === "admin" ? "Quản trị viên" : "Thành viên"}</span>
              </span>
              <ChevronRight size={16} aria-hidden className="text-muted" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <p className="text-muted">Lưu lịch sử, tham gia cộng đồng và lập lịch tu tập.</p>
            <div className="grid gap-2">
              <Link href="/signup" className="whitespace-nowrap rounded-full bg-primary px-3 py-2 text-center font-medium text-white hover:bg-primary-hover dark:text-[#10170f]">Đăng ký miễn phí</Link>
              <Link href="/login" className="whitespace-nowrap rounded-full border border-border px-3 py-2 text-center hover:bg-primary-soft">Đăng nhập</Link>
            </div>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-10">
            <div className="lg:hidden"><Brand small /></div>
            <form action="/search" role="search" className="relative ml-auto hidden max-w-md flex-1 sm:block lg:ml-0">
              <Search size={17} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <label htmlFor="global-search" className="sr-only">Tìm kiếm</label>
              <input id="global-search" name="q" placeholder="Tìm câu hỏi, chủ đề, bài viết…" className="w-full rounded-full border border-border bg-surface py-2.5 pl-11 pr-4 text-sm placeholder:text-muted/70 focus:border-sage focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft" />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/search" aria-label="Tìm kiếm" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted sm:hidden"><Search size={18} aria-hidden /></Link>
              <MotionToggle />
              <ThemeToggle />
              {member ? (
                <form action={signOut}>
                  <button aria-label="Đăng xuất" title="Đăng xuất" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-warn"><LogOut size={17} aria-hidden /></button>
                </form>
              ) : (
                <Link href="/login" className="rounded-full border border-border bg-surface px-4 py-2 text-sm lg:hidden">Đăng nhập</Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 lg:px-10 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <footer className="px-4 pb-28 text-xs text-muted lg:px-10 lg:pb-6">
          <div className="mx-auto flex max-w-5xl flex-wrap gap-x-4 gap-y-1">
            <span>© Gỡ Rối Tâm</span>
            <Link href="/privacy" className="hover:underline">Quyền riêng tư</Link>
            <Link href="/terms" className="hover:underline">Điều khoản</Link>
          </div>
        </footer>
      </div>

      <nav aria-label="Chính (di động)" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <NavLinks variant="bottom" />
      </nav>
    </div>
    </>
  );
}

function Brand({ small }: { small?: boolean }) {
  return (
    <Link href="/" aria-label="Gỡ Rối Tâm, trang chủ" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-primary">
      <BrandMark small={small} />
    </Link>
  );
}
