"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/modules/auth/session";
import { TOPICS } from "./topics";

const PostInput = z.object({
  body: z.string().trim().min(1).max(3000),
  topic: z.enum(Object.keys(TOPICS) as [keyof typeof TOPICS]),
  anonymous: z.boolean(),
});

export async function createPost(formData: FormData) {
  const { supabase } = await requireProfile();
  const parsed = PostInput.safeParse({
    body: formData.get("body"),
    topic: formData.get("topic") || "khac",
    anonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) redirect("/cong-dong?error=" + encodeURIComponent("Nội dung chưa hợp lệ (1-3000 ký tự)."));
  const { data, error } = await supabase.rpc("create_post", {
    p_body: parsed.data.body,
    p_topic: parsed.data.topic,
    p_anonymous: parsed.data.anonymous,
  });
  if (error) {
    const msg = error.message.includes("quota_exceeded")
      ? "Bạn đã đăng đủ số bài hôm nay. Mai quay lại nhé."
      : error.message.includes("duplicate")
        ? "Bạn vừa đăng nội dung này rồi."
        : "Không thể đăng bài lúc này.";
    redirect("/cong-dong?error=" + encodeURIComponent(msg));
  }
  revalidatePath("/cong-dong");
  redirect(`/cong-dong/${data}`);
}

export async function toggleReaction(formData: FormData) {
  const { supabase, user } = await requireProfile();
  const postId = z.string().uuid().parse(formData.get("postId"));
  const { data: existing } = await supabase.from("post_reactions").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (existing) await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
  else await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id });
  revalidatePath("/cong-dong");
  revalidatePath(`/cong-dong/${postId}`);
}

export async function addComment(formData: FormData) {
  const { supabase, user } = await requireProfile();
  const postId = z.string().uuid().parse(formData.get("postId"));
  const body = z.string().trim().min(1).max(1500).safeParse(formData.get("body"));
  if (!body.success) redirect(`/cong-dong/${postId}?error=` + encodeURIComponent("Bình luận 1-1500 ký tự."));
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body: body.data! });
  if (error) redirect(`/cong-dong/${postId}?error=` + encodeURIComponent("Không thể bình luận."));
  revalidatePath(`/cong-dong/${postId}`);
  redirect(`/cong-dong/${postId}`);
}

export async function reportContent(formData: FormData) {
  const { supabase, user } = await requireProfile();
  const postId = z.string().uuid().parse(formData.get("postId"));
  const commentId = formData.get("commentId") ? z.string().uuid().parse(formData.get("commentId")) : null;
  const reason = z.string().trim().min(1).max(500).safeParse(formData.get("reason"));
  if (!reason.success) redirect(`/cong-dong/${postId}?error=` + encodeURIComponent("Hãy ghi lý do báo cáo."));
  const { error } = await supabase.from("post_reports").insert({
    post_id: commentId ? null : postId,
    comment_id: commentId,
    reporter_id: user.id,
    reason: reason.data!,
  });
  const msg = error ? (error.code === "23505" ? "Bạn đã báo cáo mục này rồi." : "Không thể gửi báo cáo.") : "Cảm ơn bạn, báo cáo đã được gửi.";
  redirect(`/cong-dong/${postId}?${error ? "error" : "ok"}=` + encodeURIComponent(msg));
}

export async function deleteOwnPost(formData: FormData) {
  const { supabase } = await requireProfile();
  const postId = z.string().uuid().parse(formData.get("postId"));
  await supabase.from("posts").delete().eq("id", postId);
  revalidatePath("/cong-dong");
  redirect("/cong-dong");
}
