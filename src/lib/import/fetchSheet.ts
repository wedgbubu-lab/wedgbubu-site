import "server-only";
import { google } from "googleapis";

type ServiceAccountCreds = {
  client_email: string;
  private_key: string;
};

function loadCreds(): ServiceAccountCreds {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON 미설정");
  let parsed: ServiceAccountCreds;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON 파싱 실패");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON에 client_email/private_key 누락");
  }
  // env로 옮기면서 \n이 이스케이프된 케이스 복원.
  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
}

export type FetchedSheet = {
  fileName: string; // 스프레드시트 제목 + 시트 이름
  rows: unknown[][]; // 헤더 포함 행 배열
};

/**
 * 서비스 계정 JWT로 Google Sheets v4 API를 호출, 첫 시트의 전체 셀 값을 반환.
 * 시트는 서비스 계정 이메일에 뷰어 권한으로 공유돼야 한다.
 */
export async function fetchSheetRows(
  sheetIdOverride?: string,
): Promise<FetchedSheet> {
  const sheetId = sheetIdOverride ?? process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 미설정");

  const creds = loadCreds();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "properties.title,sheets.properties.title",
  });

  const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title;
  if (!firstSheetTitle) throw new Error("시트가 비어있습니다.");

  const values = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: firstSheetTitle,
    valueRenderOption: "FORMATTED_VALUE",
  });

  return {
    fileName: `${meta.data.properties?.title ?? "sheet"} (${firstSheetTitle})`,
    rows: (values.data.values ?? []) as unknown[][],
  };
}
