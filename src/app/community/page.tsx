import { PenLine } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { Chip, EmptyState, LinkButton, Notice, PageHeader, SetupNotice } from "@/components/ui";
import { listFeed } from "@/modules/community/queries";
import { KINDS, type Kind } from "@/modules/community/topics";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Cộng đồng" };

const TABS: { key: string; label: string; kind?: Kind; anonymous?: boolean }[] = [
  { key: "", label: "Tất cả" },
  ...Object.entries(KINDS).map(([kind, v]) => ({ key: v.tab, label: v.label, kind: kind as Kind })),
  { key: "anonymous", label: "Ẩn danh", anonymous: true },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  const sp = await searchParams;
  if (!process.env.DATABASE_URL) return <SetupNotice />;
  const user = await getCurrentUser();
  const member = Boolean(user?.emailVerified && user.nickname);
  const tab = TABS.find((t) => t.key === (sp.tab ?? "")) ?? TABS[0];
  const posts = await listFeed({ viewerId: user?.id ?? null, kind: tab.kind, anonymous: tab.anonymous });

  return (
    <div>
      <PageHeader
        eyebrow="Chia sẻ · Đồng cảm · Trí tuệ tập thể"
        title="Cộng đồng"
        sub="Nơi chia sẻ nhẹ nhàng, không phán xét và không tranh luận tôn giáo."
        action={<LinkButton href={member ? "/community/new" : "/login?next=/community/new"}><PenLine size={16} aria-hidden /> Viết bài</LinkButton>}
      />
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <nav aria-label="Lọc bài viết" className="fade-up delay-1 mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => <Chip key={t.key} href={t.key ? `/community?tab=${t.key}` : "/community"} active={t === tab}>{t.label}</Chip>)}
      </nav>
      {posts.length === 0 ? (
        <EmptyState title="Chưa có bài viết nào ở đây">{member ? "Bạn có thể là người đầu tiên chia sẻ." : "Đăng nhập để bắt đầu chia sẻ."}</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((p, i) => <PostCard key={p.id} post={p} canReact={member} delay={i} />)}
        </div>
      )}
    </div>
  );
}
