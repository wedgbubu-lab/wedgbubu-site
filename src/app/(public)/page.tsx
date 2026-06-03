import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex flex-1 max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Image
        src="/main_photo.jpg"
        alt="웨지부부"
        width={1024}
        height={1024}
        priority
        sizes="(max-width: 640px) 224px, 288px"
        className="h-56 w-56 rounded-2xl object-cover shadow-lg sm:h-72 sm:w-72"
      />
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          웨지부부
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          웨지부부 구독방
        </h1>
        <div className="mx-auto max-w-xl space-y-1 text-base leading-snug text-muted-foreground">
          <p>매일 검증된 부수입 정보와 뉴스레터를 제공합니다.</p>
          <p>구독방 신청하신 분들만 자료 열람 가능합니다.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          로그인 / 가입
        </Link>
        <Link
          href="/investments"
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "border-foreground/40",
          )}
        >
          구독방 정보 바로가기
        </Link>
      </div>
    </main>
    </div>
  );
}
