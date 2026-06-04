"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidCategory } from "@/lib/posts/categories";
import { sanitizePostHtml } from "@/lib/posts/sanitize";

function nonEmpty(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function parseCategory(v: FormDataEntryValue | null) {
  const s = nonEmpty(v);
  return s && isValidCategory(s) ? s : null;
}

export async function createPost(formData: FormData) {
  const title = nonEmpty(formData.get("title"));
  if (!title) return;
  const content = sanitizePostHtml(String(formData.get("content") ?? ""));
  const category = parseCategory(formData.get("category"));
  const isPublished = formData.get("is_published") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("posts").insert({
    title,
    content,
    category,
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
    author_id: user?.id ?? null,
  });

  revalidatePath("/admin/posts");
}

export async function updatePost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = nonEmpty(formData.get("title"));
  if (!id || !title) return;
  const content = sanitizePostHtml(String(formData.get("content") ?? ""));
  const category = parseCategory(formData.get("category"));

  const supabase = await createClient();
  await supabase
    .from("posts")
    .update({ title, content, category })
    .eq("id", id);

  revalidatePath("/admin/posts");
}

export async function togglePublish(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "publish";
  if (!id) return;

  const supabase = await createClient();
  const patch: Record<string, unknown> = { is_published: next };
  if (next) patch.published_at = new Date().toISOString();

  await supabase.from("posts").update(patch).eq("id", id);
  revalidatePath("/admin/posts");
}

export async function deletePost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/admin/posts");
}
