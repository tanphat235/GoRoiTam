"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { destroyAllSessions, requireStaff } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";

const Id = z.string().uuid();

/** Hide/restore a post or comment and close its open reports. Every action is audit-logged. */
export async function moderate(formData: FormData) {
  const staff = await requireStaff();
  const kind = z.enum(["post", "comment"]).parse(formData.get("kind"));
  const id = Id.parse(formData.get("id"));
  const action = z.enum(["hide", "restore", "dismiss"]).parse(formData.get("action"));
  const db = await getDb();
  const table = kind === "post" ? schema.posts : schema.comments;
  if (action !== "dismiss") await db.update(table).set({ status: action === "hide" ? "hidden" : "visible" }).where(eq(table.id, id));
  const r = schema.reports;
  await db.update(r)
    .set({ status: action === "hide" ? "actioned" : "dismissed" })
    .where(and(kind === "post" ? eq(r.postId, id) : eq(r.commentId, id), eq(r.status, "open")));
  await db.insert(schema.auditLog).values({ actorId: staff.id, action: `${action}_${kind}`, target: id });
  revalidatePath("/admin");
}

/** Admin only. Banning also signs the user out everywhere. */
export async function setBan(formData: FormData) {
  const staff = await requireStaff();
  if (staff.role !== "admin") return;
  const target = Id.parse(formData.get("userId"));
  if (target === staff.id) return;
  const ban = formData.get("ban") === "1";
  const db = await getDb();
  await db.update(schema.users).set({ bannedAt: ban ? new Date() : null }).where(eq(schema.users.id, target));
  if (ban) await destroyAllSessions(target);
  await db.insert(schema.auditLog).values({ actorId: staff.id, action: ban ? "ban_user" : "unban_user", target });
  revalidatePath("/admin");
}
