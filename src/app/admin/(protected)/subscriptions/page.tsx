import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setStatus } from "./actions";
import { UploadPanel } from "./upload-panel";
import { AddPanel } from "./add-panel";

type SearchParams = Promise<{ q?: string }>;

function currentYearMonth() {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const { year, month } = currentYearMonth();

  const supabase = await createClient();

  let rosterQuery = supabase
    .from("subscriber_roster")
    .select("id, name, phone, email, user_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (term) {
    const pat = `%${term}%`;
    rosterQuery = rosterQuery.or(
      `name.ilike.${pat},phone.ilike.${pat},email.ilike.${pat}`,
    );
  }

  const { data: roster } = await rosterQuery;
  const rosterIds = (roster ?? []).map((r) => r.id);

  const { data: subs } = rosterIds.length
    ? await supabase
        .from("subscriptions")
        .select("roster_id, status")
        .in("roster_id", rosterIds)
        .eq("year", year)
        .eq("month", month)
    : { data: [] as { roster_id: string; status: string }[] };

  const statusByRoster = new Map<string, string>(
    (subs ?? []).map((s) => [s.roster_id, s.status]),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <AddPanel defaultYear={year} />
      <UploadPanel defaultYear={year} />

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">구독 관리</h1>
          <p className="text-sm text-muted-foreground">
            {year}년 {month}월 기준. 명부 행을 검색하고 이번 달 status를 설정합니다.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="이름 / 연락처 / 이메일"
            className="w-64"
          />
          <Button type="submit" variant="outline">
            검색
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">연락처</th>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">매칭</th>
              <th className="px-3 py-2">{month}월 상태</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(roster ?? []).map((r) => {
              const current = statusByRoster.get(r.id) ?? "";
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.email ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.user_id ? (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                        연결됨
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        미연결
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {current ? (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {current}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">없음</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={setStatus} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="roster_id" value={r.id} />
                      <input type="hidden" name="year" value={year} />
                      <input type="hidden" name="month" value={month} />
                      <select
                        name="status"
                        defaultValue={current}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="">(없음)</option>
                        <option value="active">active</option>
                        <option value="challenge">challenge</option>
                        <option value="expired">expired</option>
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        저장
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {(roster ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  명부가 비어있습니다. 엑셀 업로드(Phase 08)로 채우세요.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
