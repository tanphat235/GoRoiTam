"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/modules/auth/session";

const Id = z.string().uuid();

/** Hide/restore a post or comment and close its open reports. Every action is audit-logged. */
export async function moderate(formData: FormData) {
  const { user } = await requireStaff();
  const kind = z.enum(["post", "comment"]).parse(formData.get("kind"));
  const id = Id.parse(formData.get("id"));
  const action = z.enum(["hide", "restore", "dismiss"]).parse(formData.get("action"));
  const admin = createAdminClient();
  const table = kind === "post" ? "posts" : "comments";
  const col = kind === "post" ? "post_id" : "comment_id";

  if (action !== "dismiss") {
    await admin.from(table).update({ status: action === "hide" ? "hidden" : "visible" }).eq("id", id);
  }
  await admin.from("post_reports").update({ status: action === "dismiss" || action === "restore" ? "dismissed" : "actioned" }).eq(col, id).eq("status", "open");
  await admin.from("audit_log").insert({ actor: user.id, action: `${action}_${kind}`, target: id });
  revalidatePath("/admin");
}

export async function setBan(formData: FormData) {
  const { user, profile } = await requireStaff();
  if (profile.role !== "admin") return;
  const target = Id.parse(formData.get("userId"));
  const ban = formData.get("ban") === "1";
  if (target === user.id) return;
  await createAdminClient().from("profiles").update({ banned_at: ban ? new Date().toISOString() : null }).eq("id", target);
  await createAdminClient().from("audit_log").insert({ actor: user.id, action: ban ? "ban_user" : "unban_user", target });
  revalidatePath("/admin");
}
