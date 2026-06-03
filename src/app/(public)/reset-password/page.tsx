import { Suspense } from "react";
import Link from "next/link";
import { HomeLink } from "@/components/home-link";
import { ResetPasswordForm } from "./form";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <HomeLink className="-mt-8 self-start" />
      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">로딩 중…</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
      <div className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground">
          ← 로그인으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
