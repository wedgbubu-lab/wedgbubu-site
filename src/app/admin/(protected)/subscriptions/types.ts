import type {
  ParseResult,
  ParseWarning,
} from "@/lib/import/parseRoster";

export type PreviewTotals = {
  rosterNew: number;
  rosterUpdated: number;
  rosterUnchanged: number;
  subsNew: number;
  subsUpdated: number;
  subsUnchanged: number;
};

export type PreviewState =
  | null
  | { error: string }
  | {
      ok: true;
      fileName: string;
      year: number;
      totals: PreviewTotals;
      warnings: ParseWarning[];
      payload: ParseResult;
    };

export type CommitState =
  | null
  | { error: string }
  | { ok: true; counts: { inserted: number; updated: number; skipped: number } };

export type AddSubState =
  | null
  | { error: string }
  | {
      ok: true;
      phone: string;
      addedMonths: number[];
    };
