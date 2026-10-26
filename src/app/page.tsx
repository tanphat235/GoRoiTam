import Link from "next/link";
import { ArrowRight, BookHeart, CalendarCheck2, HeartHandshake, MessageCircleHeart, Sparkles } from "lucide-react";
import { Lotus } from "@/components/lotus";
import { PostCard } from "@/components/post-card";
import { BloomAct } from "@/components/story/bloom-act";
import { BreathAct } from "@/components/story/breath-act";
import { CommunityRail, type RailPost } from "@/components/story/community-rail";
import { HeroScene } from "@/components/story/hero-scene";
import { ListenAct } from "@/components/story/listen-act";
import { Card, LinkButton, Notice, SetupNotice } from "@/components/ui";
import { listFeed } from "@/modules/community/queries";
import { KINDS } from "@/modules/community/topics";
import { dayInTz } from "@/modules/practice/logic";
import { practiceOverview } from "@/modules/practice/queries";
import { getCurrentUser } from "@/server/auth/session";

const QUICK = [
  { label: "Giảm lo âu", q: "Mình hay lo âu về tương lai, làm sao để tâm an hơn?" },
  { label: "Tìm ý nghĩa cuộc sống", q: "Mình thấy cuộc sống trống rỗng, không biết sống vì điều gì." },
  { label: "Xử lý mối quan hệ", q: "Mình hay mâu thuẫn với người thân, làm sao để hòa hợp hơn?" },
  { label: "Tu tập mỗi ngày", q: "Làm sao để duy trì thói quen tu tập mỗi ngày?" },
];

const FEATURES = [
  { href: "/ask", icon: MessageCircleHeart, title: "Hỏi Gỡ Rối Tâm", text: "Được lắng nghe, nhìn vấn đề qua giáo lý và nhận một việc nhỏ để thực hành.", cta: "Bắt đầu hỏi" },
  { href: "/community", icon: HeartHandshake, title: "Cộng đồng", text: "Chia sẻ bằng biệt danh hoặc ẩn danh. Nhận lời động viên, không phán xét.", cta: "Xem bảng tin" },
  { href: "/practice", icon: CalendarCheck2, title: "Lịch tu tập", text: "Thiền, niệm Phật, đọc kinh theo giờ của bạn, có theo dõi chuỗi ngày.", cta: "Lập lịch" },
  { href: "/journal", icon: BookHeart, title: "Nhật ký tâm", text: "Ghi lại suy nghĩ, cảm xúc và những điều biết ơn mỗi ngày.", cta: "Viết nhật ký" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string; reset?: string }> }) {
  const sp = await searchParams;
  const configured = Boolean(process.env.DATABASE_URL);
  const user = configured ? await getCurrentUser() : null;
  const member = user?.emailVerified && user.nickname ? user : null;

  return (
    <div className="space-y-8">
      {!configured && <SetupNotice />}
      {sp.deleted && <Notice kind="ok">Tài khoản và toàn bộ dữ liệu của bạn đã được xóa.</Notice>}
      {sp.reset && <Notice kind="ok">Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.</Notice>}

      <HeroScene>
        <div className="grid gap-6 bg-gradient-to-r from-surface/90 via-surface/55 to-transparent p-6 sm:p-10 md:min-h-[540px] md:grid-cols-[1.2fr_1fr]">
          <div>
            <p data-hero-rise className="text-sm font-medium text-accent">Phật pháp trong đời sống</p>
            <h1 className="mt-2 overflow-hidden font-serif text-[2rem] font-semibold leading-[1.15] sm:text-5xl">
              <span data-hero-line className="block">Chào {member ? member.nickname : "bạn"},</span>
              <span data-hero-line className="block text-balance">hôm nay tâm bạn thế nào?</span>
            </h1>
            <p data-hero-rise className="mt-4 max-w-lg text-pretty text-muted">Kể cho mình nghe. Mình sẽ cùng bạn nhìn lại bằng góc nhìn Phật pháp và gợi ý những hướng đi phù hợp trong cuộc sống.</p>

            <form data-hero-rise action="/ask" className="mt-6 max-w-xl rounded-3xl border-2 border-primary/35 bg-surface p-3 shadow-[0_18px_45px_-20px_rgb(40_70_45/0.55)] ring-4 ring-primary/10 transition-[border-color,box-shadow] focus-within:border-primary/70 focus-within:ring-primary/20 dark:shadow-[0_18px_45px_-18px_rgb(0_0_0/0.9)]">
              <label htmlFor="q" className="sr-only">Vấn đề bạn đang gặp</label>
              <textarea id="q" name="q" rows={3} maxLength={2000} required placeholder="Ví dụ: Mình đang lo lắng về công việc, phải làm sao để bình tĩnh hơn…" className="w-full resize-none bg-transparent px-2 py-1 text-sm placeholder:text-muted/70 focus:outline-none" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{member ? "Riêng tư · chỉ bạn thấy" : "Dùng thử 1 lượt miễn phí"}</span>
                <button className="shine inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-primary-hover dark:text-[#10170f]">
                  Hỏi Gỡ Rối Tâm <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </form>
            <div data-hero-rise className="mt-4 flex flex-wrap gap-2">
              {QUICK.map((s) => (
                <Link key={s.label} href={`/ask?q=${encodeURIComponent(s.q)}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3.5 py-1.5 text-xs backdrop-blur transition-colors hover:border-sage hover:bg-primary-soft">
                  <Sparkles size={12} aria-hidden className="text-accent" /> {s.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden items-end justify-center md:flex">
            <p data-hero-rise className="rounded-2xl bg-surface/70 px-5 py-3 font-serif italic text-foreground backdrop-blur">
              <Lotus size={22} className="mx-auto mb-1" /> “Tâm an thì vạn sự an”
            </p>
          </div>
        </div>
      </HeroScene>

      {member ? <MemberHome member={member} /> : <GuestStory />}

      <p className="text-xs text-muted">Gỡ Rối Tâm là công cụ hỗ trợ, không thay thế bác sĩ hay chuyên gia tâm lý. Nếu bạn đang gặp nguy hiểm, hãy liên hệ ngay người thân hoặc cơ sở y tế gần nhất.</p>
    </div>
  );
}

/**
 * First visit (often from YouTube): the page is a scroll journey with one feeling per act.
 * welcomed (hero) → listened to → a quiet breath → PEAK: the lotus opens → not alone → begin.
 */
async function GuestStory() {
  const configured = Boolean(process.env.DATABASE_URL);
  const posts = configured ? await listFeed({ viewerId: null, limit: 8 }) : [];
  const rail: RailPost[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.body.slice(0, 180),
    kind: KINDS[p.kind].label,
    author: p.isAnonymous ? "Ẩn danh" : (p.nickname ?? ""),
    reactions: p.reactions,
    comments: p.comments,
  }));
  return (
    <>
      <ListenAct />
      <BreathAct />
      <BloomAct />
      <CommunityRail posts={rail} />
      <section aria-labelledby="begin-title" className="grid items-center gap-8 rounded-[2rem] border border-border bg-gradient-to-br from-primary-soft via-surface to-surface p-8 shadow-soft sm:p-12 md:grid-cols-[1fr_auto]">
        <div className="md:order-2 md:text-right">
          <h2 id="begin-title" className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            Hành trình bắt đầu
            <br />
            bằng một câu hỏi.
          </h2>
          <p className="mt-4 text-muted md:ml-auto md:max-w-md">Miễn phí. Không cần tên thật. Bạn có thể bắt đầu ngay bây giờ.</p>
          <div className="mt-7 flex flex-wrap gap-3 md:justify-end">
            <LinkButton href="/ask" size="lg">Hỏi Gỡ Rối Tâm <ArrowRight size={18} aria-hidden /></LinkButton>
            <LinkButton href="/signup" size="lg" variant="ghost">Đăng ký miễn phí</LinkButton>
          </div>
        </div>
        <Lotus size={160} className="breathe mx-auto md:order-1" />
      </section>
    </>
  );
}

async function MemberHome({ member }: { member: { id: string; timezone: string } }) {
  const today = dayInTz(member.timezone);
  const [practice, recent] = await Promise.all([practiceOverview(member.id, today, today), listFeed({ viewerId: member.id, limit: 2 })]);
  const total = practice.schedules.reduce((n, s) => n + s.items.length, 0);
  const doneToday = practice.logs.filter((l) => l.day === today).length;
  return (
    <>
      <section aria-label="Các khu vực chính" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {FEATURES.map(({ href, icon: Icon, title, text, cta }, i) => (
          <Link key={href} href={href} className={`fade-up delay-${i + 1} lift group flex flex-col rounded-3xl border border-border bg-surface p-5 shadow-soft`}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
              <Icon size={23} aria-hidden />
            </span>
            <h2 className="flex-1 font-serif text-base font-semibold sm:flex-none sm:text-lg">{title}</h2>
            <p className="mt-1 hidden flex-1 text-sm text-muted sm:block">{text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">{cta} <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="fade-up">
          <h2 className="font-serif text-lg font-semibold">Tu tập hôm nay</h2>
          {total === 0 ? (
            <p className="mt-2 text-sm text-muted">Bạn chưa có lịch tu tập. <Link href="/practice" className="text-primary underline">Chọn một lịch mẫu</Link> để bắt đầu.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Đã xong {doneToday}/{total} việc · chuỗi {practice.streak} ngày</p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((doneToday / total) * 100)}%` }} /></div>
              <LinkButton href="/practice" variant="soft" size="sm" className="mt-4">Mở lịch tu tập</LinkButton>
            </>
          )}
        </Card>
        <section aria-label="Chia sẻ mới" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">Chia sẻ mới từ cộng đồng</h2>
            <Link href="/community" className="text-sm text-primary hover:underline">Xem tất cả</Link>
          </div>
          {recent.length === 0
            ? <p className="text-sm text-muted">Chưa có bài viết nào.</p>
            : recent.map((p, i) => <PostCard key={p.id} post={p} canReact delay={i + 1} />)}
        </section>
      </div>
    </>
  );
}
