import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setRole } from "./actions";

type SearchParams = Promise<{ q?: string }>;

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const term = q.trim();

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (term) {
    const pat = `%${term}%`;
    query = query.or(`email.ilike.${pat},full_name.ilike.${pat}`);
  }

  const { data: rows } = await query;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">유저 관리</h1>
          <p className="text-sm text-muted-foreground">
            가입된 프로필을 조회하고 role을 변경합니다.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="이메일 / 이름 검색"
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
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">role</th>
              <th className="px-3 py-2">가입일</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.full_name ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      u.role === "admin"
                        ? "rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        : "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {fmt(u.created_at)}
                </td>
                <td className="px-3 py-2 text-right">
                  <form action={setRole} className="flex items-center justify-end gap-2">
                    <input type="hidden" name="user_id" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      변경
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  결과 없음
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
