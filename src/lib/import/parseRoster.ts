import * as XLSX from "xlsx";

export type ParsedRosterRow = {
  name: string;
  phone: string;
  email: string | null;
  raw: Record<string, unknown>;
};

export type ParsedSubscription = {
  phone: string;
  year: number;
  month: number;
  status: "active" | "challenge";
};

export type ParseWarning = {
  rowIndex: number; // 1-based body row index (header excluded). 0 = 헤더/시트 레벨.
  reason: string;
};

export type ParseResult = {
  roster: ParsedRosterRow[];
  subscriptions: ParsedSubscription[];
  warnings: ParseWarning[];
};

export type ParseRosterOptions = {
  /** 월 컬럼을 매핑할 연도. 기본값: 현재 UTC 연도. */
  year?: number;
  /** 특정 시트 지정. 기본값: 첫 시트. */
  sheetName?: string;
};

function normalizePhone(s: string): string {
  return s.replace(/[-\s]/g, "");
}

type HeaderIndex = {
  name: number;
  phone: number;
  email: number;
  months: Map<number, number>;
};

function parseHeader(row: unknown[]): HeaderIndex {
  const idx: HeaderIndex = {
    name: -1,
    phone: -1,
    email: -1,
    months: new Map(),
  };
  for (let i = 0; i < row.length; i++) {
    const h = String(row[i] ?? "").trim();
    if (!h) continue;
    if (idx.name < 0 && /이름/.test(h)) {
      idx.name = i;
      continue;
    }
    if (idx.phone < 0 && /연락처|전화|휴대폰|핸드폰/.test(h)) {
      idx.phone = i;
      continue;
    }
    if (idx.email < 0 && /이메일|메일|email/i.test(h)) {
      idx.email = i;
      continue;
    }
    const m = h.match(/^(\d{1,2})\s*월/);
    if (m) {
      const month = Number(m[1]);
      if (month >= 1 && month <= 12 && !idx.months.has(month)) {
        idx.months.set(month, i);
      }
    }
  }
  return idx;
}

function parseStatus(cell: unknown): "active" | "challenge" | null {
  const s = String(cell ?? "").trim();
  if (!s) return null;
  // 'O' (Latin) 대소문자 + 한글 원형 기호도 active로 수용.
  if (s === "O" || s === "o" || s === "○" || s === "◯") return "active";
  if (s === "챌린지") return "challenge";
  return null;
}

/**
 * 행 배열(헤더 포함) → 정규화. 엑셀과 Google Sheets API 모두 같은 형태이므로 공용.
 */
export function parseRosterRows(
  rows: unknown[][],
  options: ParseRosterOptions = {},
): ParseResult {
  const result: ParseResult = { roster: [], subscriptions: [], warnings: [] };
  const year = options.year ?? new Date().getUTCFullYear();

  if (rows.length < 2) {
    result.warnings.push({ rowIndex: 0, reason: "데이터 행이 없습니다." });
    return result;
  }

  const header = rows[0] ?? [];
  const idx = parseHeader(header);

  if (idx.name < 0 || idx.phone < 0) {
    result.warnings.push({
      rowIndex: 0,
      reason: "필수 컬럼(이름/연락처)을 찾을 수 없습니다.",
    });
    return result;
  }

  const seenPhones = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const rowIndex = r;
    const row = rows[r] ?? [];
    const name = String(row[idx.name] ?? "").trim();
    const phone = normalizePhone(String(row[idx.phone] ?? "").trim());
    const emailRaw =
      idx.email >= 0 ? String(row[idx.email] ?? "").trim() : "";

    if (!name) continue;

    if (!phone) {
      result.warnings.push({ rowIndex, reason: `연락처 없음: ${name}` });
      continue;
    }

    if (seenPhones.has(phone)) {
      result.warnings.push({
        rowIndex,
        reason: `중복 연락처: ${phone} (${name})`,
      });
      continue;
    }
    seenPhones.add(phone);

    const raw: Record<string, unknown> = {};
    for (let i = 0; i < header.length; i++) {
      const key = String(header[i] ?? "").trim();
      if (key) raw[key] = row[i] ?? null;
    }

    result.roster.push({
      name,
      phone,
      email: emailRaw || null,
      raw,
    });

    for (const [month, col] of idx.months) {
      const status = parseStatus(row[col]);
      if (status) {
        result.subscriptions.push({ phone, year, month, status });
      }
    }
  }

  return result;
}

/**
 * 엑셀 명부 파일을 정규화한다. ArrayBuffer 입력.
 * - 헤더에서 이름/연락처/이메일/N월 컬럼만 인식, 그 외는 무시.
 * - 연락처: 하이픈·공백 제거.
 * - 이름 없는 행은 silent skip, 연락처 없는 행은 warning.
 * - 동일 연락처는 첫 행만 반영하고 이후는 warning.
 * - 월 셀: 'O'/'o'/'○'→active, '챌린지'→challenge, 그 외/빈칸 무시.
 */
export function parseRoster(
  buffer: ArrayBuffer,
  options: ParseRosterOptions = {},
): ParseResult {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = options.sheetName ?? wb.SheetNames[0];
  if (!sheetName || !wb.Sheets[sheetName]) {
    return {
      roster: [],
      subscriptions: [],
      warnings: [{ rowIndex: 0, reason: "시트를 찾을 수 없습니다." }],
    };
  }

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  return parseRosterRows(rows, options);
}
