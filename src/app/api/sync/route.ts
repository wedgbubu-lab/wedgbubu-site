import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSheetRows } from "@/lib/import/fetchSheet";
import { parseRosterRows } from "@/lib/import/parseRoster";

// googleapis는 Node 런타임 필요.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Vercel Cron은 CRON_SECRET이 설정돼 있으면 Authorization: Bearer <secret>를 붙여 호출.
  // 미설정이면 인증 검사를 생략(로컬 디버그용)하되 프로덕션에서는 반드시 설정.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const year = new Date().getUTCFullYear();

  let fileName: string;
  let rows: unknown[][];
  try {
    const fetched = await fetchSheetRows();
    fileName = fetched.fileName;
    rows = fetched.rows;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `시트 fetch 실패: ${message}` }, { status: 500 });
  }

  const parsed = parseRosterRows(rows, { year });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("commit_import", {
    p_source: "google_sheet",
    p_file_name: fileName,
    p_roster: parsed.roster,
    p_subscriptions: parsed.subscriptions,
    p_warnings: parsed.warnings,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    result: data ?? {},
    parsedCounts: {
      roster: parsed.roster.length,
      subscriptions: parsed.subscriptions.length,
      warnings: parsed.warnings.length,
    },
  });
}
