"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function withError(msg: string) {
  const params = new URLSearchParams({ error: msg });
  redirect(`/forgot-password?${params.toString()}`);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) withError("이메일을 입력하세요.");

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) withError(error.message);

  redirect("/forgot-password?sent=ok");
}
