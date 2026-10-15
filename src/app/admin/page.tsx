import { Button, Card, PageTitle } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderate, setBan } from "@/modules/admin/actions";
import { requireStaff } from "@/modules/auth/session";

export const metadata = { title: "Quản trị" };
export const dynamic = "force-dynamic";

type Report = { id: string; post_id: string | null; comment_id: string | null; reason: string; created_at: string };

export default async function Page() {
  const { supabase, profile } = await requireStaff();
  const day = new Date().toISOString().slice(0, 10);

  // Staff-only RLS policies allow these reads with the user's own session.
  const { data: reports } = await supabase.from("post_reports").select("id, post_id, comment_id, reason, created_at").eq("status", "open").order("created_at");
  const open = (reports ?? []) as Report[];
  const postIds = [...new Set(open.map((r) => r.post_id).filter(Boolean))] as string[];
  const commentIds = [...new Set(open.map((r) => r.comment_id).filter(Boolean))] as string[];
  const [{ data: posts }, { data: comments }] = await Promise.all([
    postIds.length ? supabase.from("posts").select("id, body, status, author_id").in("id", postIds) : Promise.resolve({ data: [] }),
    commentIds.length ? supabase.from("comments").select("id, body, status, author_id, post_id").in("id", commentIds) : Promise.resolve({ data: [] }),
  ]);

  const admin = createAdminClient();
  const [{ count: ai }, { count: users }] = await Promise.all([
    admin.from("ai_messages").select("id", { count: "exact", head: true }).eq("role", "assistant").gte("created_at", `${day}T00:00:00Z`),
    admin.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const items = [
    ...(posts ?? []).map((p) => ({ kind: "post" as const, id: p.id as string, body: p.body as string, status: p.status as string, author: p.author_id as string })),
    ...(comments ?? []).map((c) => ({ kind: "comment" as const, id: c.id as string, body: c.body as string, status: c.status as string, author: c.author_id as string })),
  ];
  const reasons = (it: { kind: string; id: string }) => open.filter((r) => (it.kind === "post" ? r.post_id : r.comment_id) === it.id).map((r) => r.reason);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle title="Quản trị" sub={`Vai trò: ${profile.role}`} />
      <div className="grid grid-cols-2 gap-3">
        <Card><p className="text-xs text-muted">Thành viên</p><p className="font-serif text-2xl">{users ?? 0}</p></Card>
        <Card><p className="text-xs text-muted">Lượt AI hôm nay (UTC)</p><p className="font-serif text-2xl">{ai ?? 0}</p></Card>
      </div>
      <h2 className="font-serif text-lg font-semibold">Báo cáo đang mở ({items.length})</h2>
      {items.length === 0 && <p className="text-sm text-muted">Không có báo cáo nào.</p>}
      {items.map((it) => (
        <Card key={`${it.kind}${it.id}`} className="space-y-2">
          <p className="text-xs text-muted">{it.kind === "post" ? "Bài viết" : "Bình luận"} · {it.status === "hidden" ? "đang ẩn" : "đang hiện"} · {reasons(it).length} báo cáo</p>
          <p className="whitespace-pre-wrap text-sm">{it.body}</p>
          <ul className="list-disc pl-5 text-xs text-muted">{reasons(it).map((r, i) => <li key={i}>{r}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            {(["hide", "restore", "dismiss"] as const).map((a) => (
              <form key={a} action={moderate}>
                <input type="hidden" name="kind" value={it.kind} /><input type="hidden" name="id" value={it.id} /><input type="hidden" name="action" value={a} />
                <Button variant={a === "hide" ? "danger" : "ghost"} className="!px-3 !py-1">{a === "hide" ? "Ẩn" : a === "restore" ? "Hiện lại" : "Bỏ qua"}</Button>
              </form>
            ))}
            {profile.role === "admin" && (
              <form action={setBan}>
                <input type="hidden" name="userId" value={it.author} /><input type="hidden" name="ban" value="1" />
                <Button variant="danger" className="!px-3 !py-1">Khóa tác giả</Button>
              </form>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
