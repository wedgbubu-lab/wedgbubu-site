import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          웨지부부
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          부수입을 위한 투자정보
        </h1>
        <p className="mx-auto max-w-xl text-base text-muted-foreground">
          매달 큐레이션된 투자·재테크 인사이트를 구독자에게만 전달합니다.
          명부에 등록된 구독자만 열람할 수 있습니다.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          로그인 / 가입
        </Link>
        <Link
          href="/investments"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          투자정보 바로가기
        </Link>
      </div>
    </main>
  );
}
