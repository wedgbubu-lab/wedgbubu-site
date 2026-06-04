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
import { signIn, signUp } from "./actions";

type SearchParams = Promise<{ error?: string; signup?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, signup } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <HomeLink className="-mt-8 self-start" />
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {signup === "ok" ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          가입 요청을 받았습니다. 이메일 확인이 활성화돼 있다면 메일함을 확인하세요.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>가입한 이메일과 비밀번호로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">이메일</Label>
              <Input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">비밀번호</Label>
              <Input
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              로그인
            </Button>
            <div className="text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>
            구독 명부에 등록된 정보와 동일한 이메일·연락처로 가입하면 권한이 자동 매칭됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">이름</Label>
              <Input
                id="signup-name"
                name="full_name"
                autoComplete="name"
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">이메일</Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">비밀번호</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-phone">연락처</Label>
              <Input
                id="signup-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="010-1234-5678"
              />
              <p className="text-xs text-muted-foreground">
                구독 명부의 연락처와 일치해야 자동 매칭됩니다. 미입력 시 이메일로 매칭 시도.
              </p>
            </div>
            <Button type="submit" variant="outline" className="w-full">
              가입하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
