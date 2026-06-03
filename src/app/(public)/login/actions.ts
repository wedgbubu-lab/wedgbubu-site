"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function getCreds(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

function normalizePhone(s: string) {
  return s.replace(/[-\s]/g, "");
}

function withError(message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/login?${params.toString()}`);
}

export async function signIn(formData: FormData) {
  const { email, password } = getCreds(formData);
  if (!email || !password) withError("이메일과 비밀번호를 입력하세요.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) withError(error.message);

  revalidatePath("/", "layout");
  redirect("/investments");
}

export async function signUp(formData: FormData) {
  const { email, password } = getCreds(formData);
  const phone = normalizePhone(String(formData.get("phone") ?? "").trim());
  if (!email || !password) withError("이메일과 비밀번호를 입력하세요.");

  const supabase = await createClient();
  // phone은 raw_user_meta_data에 들어가 handle_new_user 트리거가 명부 매칭에 사용.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: phone ? { data: { phone } } : undefined,
  });
  if (error) withError(error.message);

  revalidatePath("/", "layout");

  // 이메일 확인이 꺼져 있으면 응답에 세션이 포함되어 즉시 로그인 상태가 된다.
  // 켜져 있으면 session=null → 메일함 안내 페이지로.
  if (data.session) {
    redirect("/investments");
  }
  redirect("/login?signup=ok");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
