import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/posts/sanitize";
import { getCategoryAccent } from "@/lib/posts/category-color";
import { HomeLink } from "@/components/home-link";
import { PostContent } from "@/components/post-content";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  // 잘못된 id 형식은 RLS 도달 전에 가짜 not-found로.
  const post = UUID_RE.test(id)
    ? (
        await supabase
          .from("posts")
          .select("id, title, content, category, is_published, published_at")
          .eq("id", id)
          .maybeSingle()
      ).data
    : null;

  if (!post) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">게시물을 찾을 수 없습니다</h1>
          <p className="text-muted-foreground">
            삭제됐거나 열람 권한이 없는 게시물입니다.
          </p>
        </div>
        <Link
          href="/investments"
          className={buttonVariants({ variant: "outline" })}
        >
          목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex items-center gap-4">
        <HomeLink />
        <Link
          href="/investments"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 목록
        </Link>
      </div>

      <header className="mt-6 space-y-3 border-b pb-6">
        <div className="flex items-center gap-2 text-xs">
          {post.category ? (
            <span
              className="rounded-md px-2.5 py-1 text-sm font-semibold"
              style={(() => {
                const a = getCategoryAccent(post.category);
                return a
                  ? { backgroundColor: a.bg, color: a.text }
                  : undefined;
              })()}
            >
              {post.category}
            </span>
          ) : null}
          {isAdmin && !post.is_published ? (
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
              비공개
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(post.published_at)}
        </p>
      </header>

      <PostContent
        className="post-content mt-8 text-base leading-relaxed"
        html={sanitizePostHtml(post.content ?? "")}
      />
    </main>
  );
}
