import { createClient } from "@/lib/supabase/server";
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
import {
  createPost,
  deletePost,
  togglePublish,
  updatePost,
} from "./actions";
import { POST_CATEGORIES } from "@/lib/posts/categories";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ImageGalleryInput } from "@/components/image-gallery-input";

type Post = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  images: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "미발행";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function groupByDate(posts: Post[]) {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const key = fmtDate(p.published_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()];
}

export default async function AdminPostsPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, content, category, images, is_published, published_at, created_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const groups = groupByDate((posts ?? []) as Post[]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header>
        <h1 className="text-2xl font-bold">발행 게시물</h1>
        <p className="text-sm text-muted-foreground">
          새 글을 작성하고 발행 상태를 토글합니다. 일자별로 정렬됩니다.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>새 글 작성</CardTitle>
          <CardDescription>발행 체크 시 즉시 published_at이 설정됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPost} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">제목</Label>
              <Input id="new-title" name="title" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-category">카테고리</Label>
                <select
                  id="new-category"
                  name="category"
                  defaultValue=""
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">(없음)</option>
                  {POST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" name="is_published" />
                바로 발행
              </label>
            </div>
            <div className="space-y-2">
              <Label>본문</Label>
              <RichTextEditor name="content" />
            </div>
            <div className="space-y-2">
              <Label>이미지</Label>
              <ImageGalleryInput name="images" />
            </div>
            <Button type="submit">작성</Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-6">
        {groups.length === 0 ? (
          <p className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            게시물이 없습니다.
          </p>
        ) : null}
        {groups.map(([date, items]) => (
          <div key={date} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{date}</h2>
            <ul className="space-y-3">
              {items.map((p) => (
                <li key={p.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg">{p.title}</CardTitle>
                        <div className="flex items-center gap-2 text-xs">
                          {p.category ? (
                            <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                              {p.category}
                            </span>
                          ) : null}
                          {p.is_published ? (
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                              발행
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                              비공개
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {p.content ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                          {p.content}
                        </p>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <form action={togglePublish}>
                          <input type="hidden" name="id" value={p.id} />
                          <input
                            type="hidden"
                            name="next"
                            value={p.is_published ? "unpublish" : "publish"}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            {p.is_published ? "비공개로" : "발행"}
                          </Button>
                        </form>
                        <form action={deletePost}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            삭제
                          </Button>
                        </form>
                      </div>

                      <details className="rounded-md border px-3 py-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
                          수정
                        </summary>
                        <form action={updatePost} className="mt-3 space-y-3">
                          <input type="hidden" name="id" value={p.id} />
                          <div className="space-y-2">
                            <Label htmlFor={`title-${p.id}`}>제목</Label>
                            <Input
                              id={`title-${p.id}`}
                              name="title"
                              defaultValue={p.title}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`cat-${p.id}`}>카테고리</Label>
                            <select
                              id={`cat-${p.id}`}
                              name="category"
                              defaultValue={p.category ?? ""}
                              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            >
                              <option value="">(없음)</option>
                              {POST_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>본문</Label>
                            <RichTextEditor
                              name="content"
                              defaultValue={p.content ?? ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>이미지</Label>
                            <ImageGalleryInput
                              name="images"
                              defaultValue={p.images ?? []}
                            />
                          </div>
                          <Button type="submit" size="sm">
                            저장
                          </Button>
                        </form>
                      </details>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
