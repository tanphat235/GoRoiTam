import { and, count, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { Flag, MessageCircleHeart, ShieldAlert, Users } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, timeAgo } from "@/components/ui";
import { moderate, setBan } from "@/modules/admin/actions";
import { requireStaff } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";

export const metadata = { title: "Quản trị" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const staff = await requireStaff();
  const db = await getDb();
  const { reports: r, posts: p, comments: c, users: u } = schema;
  const day = new Date().toISOString().slice(0, 10);

  const open = await db.select().from(r).where(eq(r.status, "open")).orderBy(r.createdAt);
  const postIds = [...new Set(open.map((x) => x.postId).filter((x): x is string => Boolean(x)))];
  const commentIds = [...new Set(open.map((x) => x.commentId).filter((x): x is string => Boolean(x)))];
  const [posts, comments, [{ n: users }], [{ n: aiToday }], banned, audit] = await Promise.all([
    postIds.length ? db.select({ id: p.id, title: p.title, body: p.body, status: p.status, authorId: p.authorId, author: u.nickname }).from(p).innerJoin(u, eq(u.id, p.authorId)).where(inArray(p.id, postIds)) : [],
    commentIds.length ? db.select({ id: c.id, title: c.postId, body: c.body, status: c.status, authorId: c.authorId, author: u.nickname }).from(c).innerJoin(u, eq(u.id, c.authorId)).where(inArray(c.id, commentIds)) : [],
    db.select({ n: count() }).from(u),
    db.select({ n: count() }).from(schema.aiMessages).where(and(eq(schema.aiMessages.role, "assistant"), gte(schema.aiMessages.createdAt, new Date(`${day}T00:00:00Z`)))),
    db.select({ id: u.id, nickname: u.nickname, email: u.email, bannedAt: u.bannedAt }).from(u).where(isNotNull(u.bannedAt)).limit(20),
    db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.at)).limit(8),
  ]);

  const items = [
    ...posts.map((x) => ({ ...x, kind: "post" as const })),
    ...comments.map((x) => ({ ...x, kind: "comment" as const, title: "Bình luận" })),
  ];
  const reasons = (kind: string, id: string) => open.filter((x) => (kind === "post" ? x.postId : x.commentId) === id);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={staff.role === "admin" ? "Quản trị viên" : "Kiểm duyệt viên"} title="Quản trị" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: "Thành viên", v: users },
          { icon: MessageCircleHeart, label: "Lượt AI hôm nay (UTC)", v: aiToday },
          { icon: Flag, label: "Báo cáo đang mở", v: open.length },
        ].map(({ icon: Icon, label, v }, i) => (
          <Card key={label} className={`fade-up delay-${i + 1} flex items-center gap-4`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon size={22} aria-hidden /></span>
            <div><p className="font-serif text-2xl font-semibold">{v}</p><p className="text-xs text-muted">{label}</p></div>
          </Card>
        ))}
      </div>

      <section className="space-y-3" aria-label="Báo cáo">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold"><ShieldAlert size={20} aria-hidden /> Hàng đợi kiểm duyệt</h2>
        {items.length === 0 && <EmptyState title="Không có báo cáo nào đang chờ" />}
        {items.map((it) => (
          <Card key={`${it.kind}${it.id}`} className="space-y-3">
            <p className="text-xs text-muted">{it.kind === "post" ? "Bài viết" : "Bình luận"} của <b>{it.author}</b> · {it.status === "hidden" ? "đang ẩn" : "đang hiện"} · {reasons(it.kind, it.id).length} báo cáo</p>
            {it.kind === "post" && <p className="font-medium">{it.title}</p>}
            <p className="whitespace-pre-line text-sm">{it.body}</p>
            <ul className="list-disc pl-5 text-xs text-muted">{reasons(it.kind, it.id).map((x) => <li key={x.id}>{x.reason} · {timeAgo(x.createdAt)}</li>)}</ul>
            <div className="flex flex-wrap gap-2">
              {(["hide", "restore", "dismiss"] as const).map((a) => (
                <form key={a} action={moderate}>
                  <input type="hidden" name="kind" value={it.kind} /><input type="hidden" name="id" value={it.id} /><input type="hidden" name="action" value={a} />
                  <Button size="sm" variant={a === "hide" ? "danger" : "ghost"}>{a === "hide" ? "Ẩn" : a === "restore" ? "Hiện lại" : "Bỏ qua"}</Button>
                </form>
              ))}
              {staff.role === "admin" && it.authorId !== staff.id && (
                <form action={setBan}>
                  <input type="hidden" name="userId" value={it.authorId} /><input type="hidden" name="ban" value="1" />
                  <Button size="sm" variant="danger">Khóa tác giả</Button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-serif text-lg font-semibold">Tài khoản bị khóa</h2>
          {banned.length === 0 ? <p className="text-sm text-muted">Không có.</p> : (
            <ul className="space-y-2 text-sm">
              {banned.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{b.nickname ?? b.email}</span>
                  {staff.role === "admin" && (
                    <form action={setBan}><input type="hidden" name="userId" value={b.id} /><input type="hidden" name="ban" value="0" /><Button size="sm" variant="ghost">Mở khóa</Button></form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-serif text-lg font-semibold">Nhật ký thao tác</h2>
          {audit.length === 0 ? <p className="text-sm text-muted">Chưa có thao tác nào.</p> : (
            <ul className="space-y-1 text-xs text-muted">{audit.map((a) => <li key={a.id}>{timeAgo(a.at)} · {a.action}</li>)}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}
