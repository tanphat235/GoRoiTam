import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getLLM } from "@/lib/llm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkMessage, crisisReply } from "@/modules/ai/guard";
import { finalizeReply, lockPractice } from "@/modules/ai/format";
import { buildSystemPrompt, type Chunk } from "@/modules/ai/prompt";

const Body = z.object({ message: z.string(), conversationId: z.string().uuid().optional() });

const GUEST_PER_COOKIE = 1;
const GUEST_PER_IP = 5;

const hash = (s: string) => createHash("sha256").update(`${process.env.GUEST_HASH_SALT ?? ""}|${s}`).digest("hex");

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const checked = checkMessage(parsed.data.message);
  if (!checked.ok) return NextResponse.json({ error: "invalid", message: checked.error }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  // Crisis messages get a fixed supportive reply, never count against quota, never reach the LLM.
  if (checked.crisis) {
    return NextResponse.json({
      reply: crisisReply(process.env.CRISIS_HELP_TEXT),
      sources: [],
      locked: false,
      crisis: true,
      conversationId: parsed.data.conversationId ?? null,
    });
  }

  const guestRes = new NextResponse();
  let guestGid: string | undefined;
  let refundUser: string | undefined;

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("id, banned_at").eq("id", user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "need_profile" }, { status: 403 });
    if (profile.banned_at) return NextResponse.json({ error: "banned" }, { status: 403 });
    const { data: allowed } = await supabase.rpc("consume_quota", { p_kind: "ai" });
    if (!allowed) return NextResponse.json({ error: "quota" }, { status: 429 });
    refundUser = user.id;
  } else {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    guestGid = req.cookies.get("gid")?.value || randomUUID();
    const admin = createAdminClient();
    const a = await admin.rpc("consume_guest_quota", { p_key: hash(`c:${guestGid}`), p_limit: GUEST_PER_COOKIE });
    const b = await admin.rpc("consume_guest_quota", { p_key: hash(`i:${ip}`), p_limit: GUEST_PER_IP });
    if (!a.data || !b.data) return NextResponse.json({ error: "guest_limit" }, { status: 429 });
    guestRes.cookies.set("gid", guestGid, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
  }

  try {
    const { data: found } = await supabase.rpc("search_teachings", { q: checked.text, k: 4 });
    const chunks: Chunk[] = (found ?? []) as Chunk[];

    let history: { role: "user" | "assistant"; content: string }[] = [];
    let conversationId = parsed.data.conversationId;
    if (user && conversationId) {
      const { data: rows } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(6);
      history = (rows ?? []).reverse() as typeof history;
    }

    const raw = await getLLM().chat([
      { role: "system", content: buildSystemPrompt(chunks) },
      ...history,
      { role: "user", content: checked.text },
    ]);
    const { text, sources, formatOk } = finalizeReply(raw, chunks);

    if (user) {
      if (!conversationId) {
        const { data: conv, error } = await supabase
          .from("ai_conversations")
          .insert({ user_id: user.id, title: checked.text.slice(0, 40) })
          .select("id")
          .single();
        if (error) throw error;
        conversationId = conv.id;
      }
      await supabase.from("ai_messages").insert([
        { conversation_id: conversationId, role: "user", content: checked.text },
        { conversation_id: conversationId, role: "assistant", content: text, sources, flags: { formatOk } },
      ]);
    }

    const view = user ? { visible: text, locked: false } : lockPractice(text);
    const res = NextResponse.json({
      reply: view.visible,
      sources: view.locked ? [] : sources,
      locked: view.locked,
      crisis: false,
      conversationId: conversationId ?? null,
    });
    guestRes.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  } catch (e) {
    console.error("ai/ask failed", e instanceof Error ? e.message : e);
    if (refundUser) await createAdminClient().rpc("refund_quota", { p_user: refundUser, p_kind: "ai" });
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
