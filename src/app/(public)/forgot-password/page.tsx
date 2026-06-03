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
import { HomeLink } from "@/components/home-link";
import { requestPasswordReset } from "./actions";

type SearchParams = Promise<{ error?: string; sent?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <HomeLink className="-mt-8 self-start" />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {sent === "ok" ? (
        <div className="space-y-4">
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            비밀번호 재설정 링크를 이메일로 보냈습니다. 메일함을 확인하세요.
          </div>
          <p className="text-center text-sm text-muted-foreground">
            메일이 오지 않으면 스팸함을 확인하거나 다시 요청하세요.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>비밀번호 찾기</CardTitle>
            <CardDescription>
              가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={requestPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                재설정 링크 보내기
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground">
          ← 로그인으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
