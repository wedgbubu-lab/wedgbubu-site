"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function withError(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/admin/login?${params.toString()}`);
}

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) withError("이메일과 비밀번호를 입력하세요.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) withError(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    withError("어드민 권한이 없습니다.");
  }

  revalidatePath("/", "layout");
  redirect("/admin/users");
}
