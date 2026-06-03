import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(public)/login/actions";
import { Button } from "@/components/ui/button";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/admin/login");

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/users" className="font-semibold">
              어드민
            </Link>
            <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
              유저
            </Link>
            <Link
              href="/admin/subscriptions"
              className="text-muted-foreground hover:text-foreground"
            >
              구독
            </Link>
            <Link href="/admin/posts" className="text-muted-foreground hover:text-foreground">
              게시물
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{profile.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
