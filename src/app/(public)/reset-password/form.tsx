"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Stage = "exchanging" | "ready" | "success" | "error";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("exchanging");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setErrorMsg(
        "잘못된 접근입니다. 비밀번호 재설정 링크를 다시 요청하세요.",
      );
      setStage("error");
      return;
    }
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setErrorMsg(
          "링크가 만료됐거나 유효하지 않습니다. 비밀번호 재설정을 다시 요청하세요.",
        );
        setStage("error");
      } else {
        setStage("ready");
      }
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    const confirm = String(fd.get("confirm"));

    if (password !== confirm) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
    } else {
      setStage("success");
      setTimeout(() => router.push("/investments"), 2500);
    }
  }

  if (stage === "exchanging") {
    return (
      <p className="text-center text-sm text-muted-foreground">인증 중…</p>
    );
  }

  if (stage === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          비밀번호가 변경됐습니다. 잠시 후 이동합니다…
        </div>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
        <div className="text-center text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
            비밀번호 재설정 다시 요청하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {errorMsg ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>새 비밀번호 설정</CardTitle>
          <CardDescription>6자 이상의 새 비밀번호를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">비밀번호 확인</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "변경 중…" : "비밀번호 변경"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
