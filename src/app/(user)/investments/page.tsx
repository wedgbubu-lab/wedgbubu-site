import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { stripHtmlForPreview } from "@/lib/posts/sanitize";
import { getCategoryAccent } from "@/lib/posts/category-color";
import { cn } from "@/lib/utils";
import { HomeLink } from "@/components/home-link";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

const TABS = [
  { label: "전체", value: "" },
  { label: "부수입정보", value: "부수입정보" },
  { label: "뉴스레터", value: "뉴스레터" },
] as const;

const FILTERABLE: ReadonlySet<string> = new Set(
  TABS.map((t) => t.value).filter(Boolean),
);

type SearchParams = Promise<{ category?: string }>;

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category: rawCategory } = await searchParams;
  const activeCategory =
    rawCategory && FILTERABLE.has(rawCategory) ? rawCategory : "";

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

  let query = supabase
    .from("posts")
    .select("id, title, content, category, is_published, published_at")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (!isAdmin) {
    query = query.eq("is_published", true);
  }
  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }

  const { data: posts } = await query;
  const list = posts ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <HomeLink className="mb-4" />
      <header className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold">웨지부부 구독방 정보</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? `어드민 — 미발행 포함 · 총 ${list.length}건`
            : `최근 발행순 · 총 ${list.length}건`}
        </p>
      </header>

      <CategoryTabs active={activeCategory} />

      {list.length === 0 ? (
        <EmptyState
          isAdmin={isAdmin}
          hasFilter={Boolean(activeCategory)}
          activeCategory={activeCategory}
        />
      ) : (
        <ul className="space-y-4">
          {list.map((post) => {
            const accent = getCategoryAccent(post.category);
            return (
            <li key={post.id}>
              <Link
                href={`/investments/${post.id}`}
                className="block transition-colors hover:bg-muted/30"
              >
                <Card
                  style={
                    accent ? { borderColor: accent.hex, borderWidth: 2 } : undefined
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-xl">{post.title}</CardTitle>
                      <div className="flex items-center gap-2 text-xs">
                        {post.category ? (
                          <span
                            className="rounded px-2 py-0.5 font-medium text-zinc-900"
                            style={
                              accent
                                ? { backgroundColor: accent.hex }
                                : undefined
                            }
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
                    </div>
                    <CardDescription>
                      {formatDate(post.published_at)}
                    </CardDescription>
                  </CardHeader>
                  {post.content ? (
                    <CardContent className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {stripHtmlForPreview(post.content)}
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function CategoryTabs({ active }: { active: string }) {
  return (
    <nav className="mb-8 flex items-center gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = active === tab.value;
        const href = tab.value
          ? `/investments?category=${encodeURIComponent(tab.value)}`
          : "/investments";
        return (
          <Link
            key={tab.value || "all"}
            href={href}
            scroll={false}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
              isActive
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function EmptyState({
  isAdmin,
  hasFilter,
  activeCategory,
}: {
  isAdmin: boolean;
  hasFilter: boolean;
  activeCategory: string;
}) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-dashed px-6 py-16 text-center">
        <p className="text-muted-foreground">
          "{activeCategory}" 카테고리 게시물이 없습니다.
        </p>
        <Link
          href="/investments"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          전체 보기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-dashed px-6 py-16 text-center">
      <div className="space-y-1">
        <p className="font-medium">
          {isAdmin ? "게시물이 없습니다" : "열람 권한이 없습니다"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "어드민 콘솔에서 새 글을 작성하세요."
            : "웨지부부 구독방 정보는 활성 구독자에게만 공개됩니다. 운영자에게 문의하세요."}
        </p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
        홈으로
      </Link>
    </div>
  );
}
