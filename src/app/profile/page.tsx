import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { Settings } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { Landscape } from "@/components/scenery";
import { AvatarQuickEdit } from "@/components/avatar-uploader";
import { Badge, Card, Chip, EmptyState, LinkButton } from "@/components/ui";
import { listMyPosts } from "@/modules/community/queries";
import { dayInTz } from "@/modules/practice/logic";
import { MOODS } from "@/modules/practice/moods";
import { listJournal, practiceOverview } from "@/modules/practice/queries";
import { requireMember } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";

export const metadata = { title: "Trang cá nhân" };

const TABS = [
  { key: "posts", label: "Bài viết" },
  { key: "journal", label: "Nhật ký" },
  { key: "practice", label: "Lịch tu tập" },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const user = await requireMember("/profile");
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "posts";
  const today = dayInTz(user.timezone);
  const db = await getDb();
  const [posts, journal, practice, [{ n: journalCount }]] = await Promise.all([
    listMyPosts(user.id),
    listJournal(user.id, 10),
    practiceOverview(user.id, today, new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10)),
    db.select({ n: count() }).from(schema.journalEntries).where(eq(schema.journalEntries.userId, user.id)),
  ]);
  const practicedDays = new Set(practice.logs.map((l) => l.day)).size;

  return (
    <div className="space-y-6">
      <section className="fade-up overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft">
        <div className="relative h-36 sm:h-48"><Landscape idp="cover" className="absolute inset-0 h-full w-full" /></div>
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <AvatarQuickEdit name={user.nickname} avatarKey={user.avatarKey} size={92} />
            <LinkButton href="/profile/settings" variant="ghost" size="sm"><Settings size={15} aria-hidden /> Cài đặt</LinkButton>
          </div>
          <h1 className="mt-3 font-serif text-2xl font-semibold">{user.nickname}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge>{user.role === "admin" ? "Quản trị viên" : user.role === "moderator" ? "Kiểm duyệt viên" : "Thành viên"}</Badge>
            <span>Tham gia {user.createdAt.toLocaleDateString("vi-VN")}</span>
          </div>
          <p className="mt-3 max-w-xl font-serif italic text-muted">{user.bio || "“Tu không phải để thoát khỏi thế gian, mà để sống an nhiên giữa thế gian.”"}</p>
          <dl className="mt-5 grid max-w-md grid-cols-3 gap-2 text-center">
            {[["Bài viết", posts.length], ["Ngày tu tập", practicedDays], ["Nhật ký", journalCount]].map(([label, v]) => (
              <div key={label as string} className="rounded-2xl bg-surface-2 py-3">
                <dd className="font-serif text-2xl font-semibold">{v}</dd>
                <dt className="text-xs text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <nav aria-label="Nội dung hồ sơ" className="flex gap-2">
        {TABS.map((t) => <Chip key={t.key} href={`/profile?tab=${t.key}`} active={t.key === tab}>{t.label}</Chip>)}
      </nav>

      {tab === "posts" && (posts.length === 0
        ? <EmptyState title="Bạn chưa có bài viết nào"><Link href="/community/new" className="text-primary underline">Viết bài đầu tiên</Link></EmptyState>
        : <div className="grid gap-4 md:grid-cols-2">
            {posts.map((p, i) => (
              <div key={p.id} className="space-y-1.5">
                {(p.status === "hidden" || p.isAnonymous) && (
                  <p className={`px-2 text-xs ${p.status === "hidden" ? "text-warn" : "text-muted"}`}>
                    {p.status === "hidden" ? "Đang bị ẩn, chờ kiểm duyệt" : "Đăng ẩn danh · chỉ bạn biết đây là bài của bạn"}
                  </p>
                )}
                <PostCard post={p} canReact delay={i} />
              </div>
            ))}
          </div>)}

      {tab === "journal" && (journal.length === 0
        ? <EmptyState title="Chưa có nhật ký"><Link href="/journal" className="text-primary underline">Viết nhật ký</Link></EmptyState>
        : <div className="grid gap-3 md:grid-cols-2">
            {journal.map((e) => (
              <Card key={e.id} className="!p-4">
                <p className="mb-1 text-xs text-muted">{MOODS[e.mood - 1]?.emoji} {MOODS[e.mood - 1]?.label} · {e.createdAt.toLocaleDateString("vi-VN")}</p>
                <p className="line-clamp-4 whitespace-pre-line text-sm">{e.text}</p>
              </Card>
            ))}
          </div>)}

      {tab === "practice" && (practice.schedules.length === 0
        ? <EmptyState title="Chưa có lịch tu tập"><Link href="/practice" className="text-primary underline">Lập lịch</Link></EmptyState>
        : <div className="grid gap-3 md:grid-cols-2">
            {practice.schedules.map((s) => (
              <Card key={s.id} className="!p-4">
                <p className="font-medium">{s.title}</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">{s.items.map((it) => <li key={it.key}>{it.time} · {it.label}</li>)}</ul>
              </Card>
            ))}
          </div>)}
    </div>
  );
}
