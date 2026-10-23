import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getLLM } from "@/lib/llm";
import { finalizeReply, lockPractice } from "@/modules/ai/format";
import { checkMessage, crisisReply } from "@/modules/ai/guard";
import { buildSystemPrompt } from "@/modules/ai/prompt";
import { searchTeachings } from "@/modules/ai/retrieve";
import { classifyTopic } from "@/modules/ai/topic";
import { getCurrentUser } from "@/server/auth/session";
import { sha256 } from "@/server/crypto";
import { getDb, schema } from "@/server/db";
import { consumeGuestQuota, consumeQuota, refundQuota } from "@/server/quota";
import { clientIpFrom } from "@/server/rate-limit";

const Body = z.object({ message: z.string(), conversationId: z.string().uuid().optional() });
const GUEST_PER_COOKIE = 1;
const GUEST_PER_IP = 5;
// Hard ceiling on free guest answers per day across ALL visitors: bounds LLM cost even if a bot
// rotates cookies and IPs.
const GUEST_GLOBAL_DAILY = Number(process.env.GUEST_AI_DAILY_LIMIT ?? 100);

/** Blocks cross-site POSTs (this route is not a Server Action, so it needs its own origin check). */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !origin || origin === req.nextUrl.origin || origin === process.env.NEXT_PUBLIC_SITE_URL;
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const checked = checkMessage(parsed.data.message);
  if (!checked.ok) return NextResponse.json({ error: "invalid", message: checked.error }, { status: 400 });

  const user = await getCurrentUser();
  const member = user?.emailVerified && user.nickname ? user : null;
  if (user && !member) return NextResponse.json({ error: "need_profile" }, { status: 403 });

  // Crisis messages get a fixed supportive reply: no quota, no LLM call, nothing stored.
  if (checked.crisis) {
    return NextResponse.json({ reply: crisisReply(process.env.CRISIS_HELP_TEXT), sources: [], locked: false, crisis: true, conversationId: parsed.data.conversationId ?? null });
  }

  // Scope gate: only life questions reach the model. Refusals are fixed text: no LLM call, no tokens,
  // no quota used, nothing stored.
  const topic = classifyTopic(checked.text, Boolean(member && parsed.data.conversationId));
  if (!topic.allowed) {
    return NextResponse.json({ reply: topic.reply, sources: [], locked: false, crisis: false, offTopic: true, conversationId: parsed.data.conversationId ?? null });
  }

  const db = await getDb();
  let guestCookie: string | undefined;
  if (member) {
    if (!(await consumeQuota(member.id, member.plan, "ai"))) return NextResponse.json({ error: "quota" }, { status: 429 });
  } else {
    const ip = clientIpFrom(req.headers);
    guestCookie = req.cookies.get("grt_gid")?.value || randomUUID();
    const salt = process.env.GUEST_HASH_SALT ?? "";
    const allowed =
      (await consumeGuestQuota(sha256(`${salt}|c|${guestCookie}`), GUEST_PER_COOKIE)) &&
      (await consumeGuestQuota(sha256(`${salt}|i|${ip}`), GUEST_PER_IP)) &&
      (await consumeGuestQuota("global", GUEST_GLOBAL_DAILY));
    if (!allowed) return NextResponse.json({ error: "guest_limit" }, { status: 429 });
  }

  try {
    let conversationId = parsed.data.conversationId;
    let history: { role: "user" | "assistant"; content: string }[] = [];
    if (member && conversationId) {
      const [conv] = await db.select({ id: schema.aiConversations.id }).from(schema.aiConversations)
        .where(and(eq(schema.aiConversations.id, conversationId), eq(schema.aiConversations.userId, member.id)));
      if (!conv) conversationId = undefined; // not yours: start a new conversation instead
      else {
        const m = schema.aiMessages;
        const rows = await db.select({ role: m.role, content: m.content }).from(m)
          .where(eq(m.conversationId, conversationId)).orderBy(desc(m.createdAt)).limit(6);
        history = rows.reverse();
      }
    }

    const chunks = await searchTeachings(checked.text, 4);
    const raw = await getLLM().chat([
      { role: "system", content: buildSystemPrompt(chunks) },
      ...history,
      { role: "user", content: checked.text },
    ]);
    const { text, sources, formatOk } = finalizeReply(raw, chunks);

    if (member) {
      if (!conversationId) {
        [{ id: conversationId }] = await db.insert(schema.aiConversations)
          .values({ userId: member.id, title: checked.text.slice(0, 60) }).returning({ id: schema.aiConversations.id });
      }
      await db.insert(schema.aiMessages).values([
        { conversationId: conversationId!, role: "user", content: checked.text },
        { conversationId: conversationId!, role: "assistant", content: text, sources, flags: { formatOk } },
      ]);
    }

    const view = member ? { visible: text, locked: false } : lockPractice(text);
    const res = NextResponse.json({ reply: view.visible, sources: view.locked ? [] : sources, locked: view.locked, crisis: false, conversationId: conversationId ?? null });
    if (guestCookie) res.cookies.set("grt_gid", guestCookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 31_536_000, path: "/" });
    return res;
  } catch (e) {
    console.error("ai/ask failed:", e instanceof Error ? e.message : e);
    if (member) await refundQuota(member.id, "ai");
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
