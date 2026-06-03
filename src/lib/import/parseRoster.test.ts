import { describe, test, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseRoster } from "./parseRoster";

function makeBuffer(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as
    | ArrayBuffer
    | Uint8Array;
  if (out instanceof ArrayBuffer) return out;
  return out.buffer.slice(
    out.byteOffset,
    out.byteOffset + out.byteLength,
  ) as ArrayBuffer;
}

describe("parseRoster", () => {
  test("happy path: header detection, phone normalize, month mapping", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "이메일", "1월", "2월", "3월", "Yes/No Claude"],
      ["김철수", "010-1234-5678", "kim@example.com", "O", "챌린지", "", "Y"],
      ["박영희", "010 9876 5432", "", "", "", "O", ""],
    ]);
    const r = parseRoster(buf, { year: 2026 });

    expect(r.warnings).toEqual([]);
    expect(r.roster).toHaveLength(2);
    expect(r.roster[0].name).toBe("김철수");
    expect(r.roster[0].phone).toBe("01012345678");
    expect(r.roster[0].email).toBe("kim@example.com");
    expect(r.roster[1].phone).toBe("01098765432");
    expect(r.roster[1].email).toBe(null);

    expect(r.subscriptions).toEqual([
      { phone: "01012345678", year: 2026, month: 1, status: "active" },
      { phone: "01012345678", year: 2026, month: 2, status: "challenge" },
      { phone: "01098765432", year: 2026, month: 3, status: "active" },
    ]);
  });

  test("raw preserves original header keys only", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "이메일", "1월", "Yes/No Claude"],
      ["김", "010-1234-5678", "k@e.com", "O", "Y"],
    ]);
    const r = parseRoster(buf, { year: 2026 });
    expect(r.roster[0].raw).toMatchObject({
      이름: "김",
      이메일: "k@e.com",
      "1월": "O",
      "Yes/No Claude": "Y",
    });
  });

  test("skips rows without name silently (no warning)", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "1월"],
      ["", "010-0000-0000", "O"],
      ["김", "010-1111-2222", "O"],
    ]);
    const r = parseRoster(buf);
    expect(r.roster).toHaveLength(1);
    expect(r.subscriptions).toHaveLength(1);
    expect(r.warnings).toHaveLength(0);
  });

  test("warns when name exists but phone is empty", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "1월"],
      ["김", "", "O"],
    ]);
    const r = parseRoster(buf);
    expect(r.roster).toHaveLength(0);
    expect(r.subscriptions).toHaveLength(0);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].reason).toMatch(/연락처 없음/);
  });

  test("ignores unknown month cell values without warning", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "1월", "2월"],
      ["김", "010-1234-5678", "?", "X"],
    ]);
    const r = parseRoster(buf);
    expect(r.roster).toHaveLength(1);
    expect(r.subscriptions).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  test("accepts lowercase 'o' and Korean ○ as active", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "1월", "2월"],
      ["김", "010-1234-5678", "o", "○"],
    ]);
    const r = parseRoster(buf);
    expect(r.subscriptions).toHaveLength(2);
    for (const s of r.subscriptions) expect(s.status).toBe("active");
  });

  test("dedupes by normalized phone with warning", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "1월"],
      ["김1", "010-1111-2222", "O"],
      ["김2", "01011112222", "O"],
    ]);
    const r = parseRoster(buf);
    expect(r.roster).toHaveLength(1);
    expect(r.subscriptions).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].reason).toMatch(/중복/);
  });

  test("month numbers out of 1..12 are ignored", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "0월", "13월", "5월"],
      ["김", "010-1234-5678", "O", "O", "O"],
    ]);
    const r = parseRoster(buf);
    expect(r.subscriptions).toHaveLength(1);
    expect(r.subscriptions[0].month).toBe(5);
  });

  test("emits header warning when required columns are missing", () => {
    const buf = makeBuffer([
      ["성함", "전번", "1월"],
      ["김", "010-1111-2222", "O"],
    ]);
    const r = parseRoster(buf);
    expect(r.roster).toHaveLength(0);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].reason).toMatch(/필수 컬럼/);
  });

  test("year defaults to current UTC year when unspecified", () => {
    const buf = makeBuffer([
      ["이름", "연락처", "1월"],
      ["김", "010-1234-5678", "O"],
    ]);
    const r = parseRoster(buf);
    const expected = new Date().getUTCFullYear();
    expect(r.subscriptions[0].year).toBe(expected);
  });
});
