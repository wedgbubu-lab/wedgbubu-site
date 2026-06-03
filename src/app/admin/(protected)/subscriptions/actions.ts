"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseRoster, type ParseResult } from "@/lib/import/parseRoster";
import type {
  AddSubState,
  CommitState,
  PreviewState,
  PreviewTotals,
} from "./types";

const VALID_STATUSES = ["active", "challenge", "expired"] as const;
type Status = (typeof VALID_STATUSES)[number];

function parseStatusInput(raw: string): Status | "" | null {
  if (raw === "") return "";
  return (VALID_STATUSES as readonly string[]).includes(raw)
    ? (raw as Status)
    : null;
}

export async function setStatus(formData: FormData) {
  const rosterId = String(formData.get("roster_id") ?? "");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const status = parseStatusInput(String(formData.get("status") ?? ""));

  if (!rosterId || !Number.isFinite(year) || !Number.isFinite(month)) return;
  if (status === null) return;

  const supabase = await createClient();

  if (status === "") {
    await supabase
      .from("subscriptions")
      .delete()
      .eq("roster_id", rosterId)
      .eq("year", year)
      .eq("month", month);
    revalidatePath("/admin/subscriptions");
    return;
  }

  const { data: roster } = await supabase
    .from("subscriber_roster")
    .select("user_id")
    .eq("id", rosterId)
    .maybeSingle();

  await supabase.from("subscriptions").upsert(
    {
      roster_id: rosterId,
      user_id: roster?.user_id ?? null,
      year,
      month,
      status,
    },
    { onConflict: "roster_id,year,month" },
  );

  revalidatePath("/admin/subscriptions");
}

// --- Import ---------------------------------------------------------------

function diffRoster(
  parsed: ParseResult["roster"],
  existing: { phone: string; name: string | null; email: string | null }[],
) {
  const byPhone = new Map(existing.map((r) => [r.phone, r]));
  let n = 0,
    u = 0,
    s = 0;
  for (const r of parsed) {
    const ex = byPhone.get(r.phone);
    if (!ex) n++;
    else if (
      (ex.name ?? "") !== r.name ||
      (ex.email ?? null) !== (r.email ?? null)
    )
      u++;
    else s++;
  }
  return { n, u, s };
}

function diffSubs(
  parsed: ParseResult["subscriptions"],
  existing: {
    roster_id: string;
    year: number;
    month: number;
    status: string;
  }[],
  phoneByRosterId: Map<string, string>,
) {
  const key = (phone: string, month: number) => `${phone}:${month}`;
  const exMap = new Map<string, string>();
  for (const e of existing) {
    const phone = phoneByRosterId.get(e.roster_id);
    if (phone) exMap.set(key(phone, e.month), e.status);
  }
  let n = 0,
    u = 0,
    s = 0;
  for (const sub of parsed) {
    const cur = exMap.get(key(sub.phone, sub.month));
    if (cur === undefined) n++;
    else if (cur !== sub.status) u++;
    else s++;
  }
  return { n, u, s };
}

export async function previewImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const file = formData.get("file");
  const yearRaw = formData.get("year");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "파일을 선택하세요." };
  }
  const year = Number(yearRaw);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "연도를 2000~2100 범위로 입력하세요." };
  }

  let parsed: ParseResult;
  try {
    const buf = await file.arrayBuffer();
    parsed = parseRoster(buf, { year });
  } catch (e) {
    return { error: `파일 파싱 실패: ${e instanceof Error ? e.message : String(e)}` };
  }

  const supabase = await createClient();
  const phones = parsed.roster.map((r) => r.phone);

  const { data: existingRoster } = phones.length
    ? await supabase
        .from("subscriber_roster")
        .select("id, name, phone, email")
        .in("phone", phones)
    : { data: [] as { id: string; name: string | null; phone: string; email: string | null }[] };

  const rosterDiff = diffRoster(parsed.roster, existingRoster ?? []);

  const existingRosterIds = (existingRoster ?? []).map((r) => r.id);
  const phoneByRosterId = new Map(
    (existingRoster ?? []).map((r) => [r.id, r.phone]),
  );

  const { data: existingSubs } = existingRosterIds.length
    ? await supabase
        .from("subscriptions")
        .select("roster_id, year, month, status")
        .in("roster_id", existingRosterIds)
        .eq("year", year)
    : { data: [] as { roster_id: string; year: number; month: number; status: string }[] };

  const subsDiff = diffSubs(parsed.subscriptions, existingSubs ?? [], phoneByRosterId);

  const totals: PreviewTotals = {
    rosterNew: rosterDiff.n,
    rosterUpdated: rosterDiff.u,
    rosterUnchanged: rosterDiff.s,
    subsNew: subsDiff.n,
    subsUpdated: subsDiff.u,
    subsUnchanged: subsDiff.s,
  };

  return {
    ok: true,
    fileName: file.name,
    year,
    totals,
    warnings: parsed.warnings,
    payload: parsed,
  };
}

export async function commitImport(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  const payloadRaw = String(formData.get("payload") ?? "");
  const fileName = String(formData.get("fileName") ?? "");

  if (!payloadRaw) return { error: "payload가 비어있습니다." };

  let payload: ParseResult;
  try {
    payload = JSON.parse(payloadRaw) as ParseResult;
  } catch {
    return { error: "payload 파싱 실패" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("commit_import", {
    p_source: "xlsx",
    p_file_name: fileName || null,
    p_roster: payload.roster,
    p_subscriptions: payload.subscriptions,
    p_warnings: payload.warnings,
  });

  if (error) return { error: `commit_import 실패: ${error.message}` };

  const result = (data ?? {}) as {
    batch_id?: string;
    inserted?: number;
    updated?: number;
    skipped?: number;
  };

  revalidatePath("/admin/subscriptions");

  return {
    ok: true,
    counts: {
      inserted: result.inserted ?? 0,
      updated: result.updated ?? 0,
      skipped: result.skipped ?? 0,
    },
  };
}

// --- 단건 구독 추가 ---------------------------------------------------------

function normalizePhone(s: string) {
  return s.replace(/[-\s]/g, "");
}

export async function addSubscription(
  _prev: AddSubState,
  formData: FormData,
): Promise<AddSubState> {
  const name = String(formData.get("name") ?? "").trim() || null;
  const phone = normalizePhone(String(formData.get("phone") ?? "").trim());
  const year = Number(formData.get("year"));
  const statusRaw = String(formData.get("status") ?? "");
  const months = formData
    .getAll("months")
    .map((v) => Number(v))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);

  if (!phone) return { error: "연락처는 필수입니다." };
  if (months.length === 0) return { error: "월을 하나 이상 선택하세요." };
  if (!(VALID_STATUSES as readonly string[]).includes(statusRaw)) {
    return { error: "상태가 올바르지 않습니다." };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "연도가 올바르지 않습니다." };
  }

  const supabase = await createClient();

  // commit_import RPC를 그대로 재사용해 roster↔profiles 자동 매칭 + 감사로그까지.
  const { error } = await supabase.rpc("commit_import", {
    p_source: "manual",
    p_file_name: "manual-add",
    p_roster: [
      {
        name: name ?? phone,
        phone,
        email: null,
        raw: { source: "manual", added_at: new Date().toISOString() },
      },
    ],
    p_subscriptions: months.map((month) => ({
      phone,
      year,
      month,
      status: statusRaw,
    })),
    p_warnings: [],
  });

  if (error) return { error: `추가 실패: ${error.message}` };

  revalidatePath("/admin/subscriptions");

  return {
    ok: true,
    phone,
    addedMonths: [...months].sort((a, b) => a - b),
  };
}
