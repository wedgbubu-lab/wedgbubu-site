import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(public)/login/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-semibold transition-opacity hover:opacity-70">
          웨지부부
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
