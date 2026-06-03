"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { commitImport, previewImport } from "./actions";
import type { CommitState, PreviewState } from "./types";

export function UploadPanel({ defaultYear }: { defaultYear: number }) {
  const [preview, runPreview, previewPending] = useActionState<
    PreviewState,
    FormData
  >(previewImport, null);

  const [commit, runCommit, commitPending] = useActionState<
    CommitState,
    FormData
  >(commitImport, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>엑셀 업로드</CardTitle>
        <CardDescription>
          파일을 선택해 미리보기 → 확정 시 명부/구독에 반영됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={runPreview} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="upload-file">엑셀 파일</Label>
            <Input
              id="upload-file"
              name="file"
              type="file"
              accept=".xlsx,.xls"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-year">연도</Label>
            <Input
              id="upload-year"
              name="year"
              type="number"
              min={2000}
              max={2100}
              defaultValue={defaultYear}
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={previewPending}>
            {previewPending ? "분석 중…" : "미리보기"}
          </Button>
        </form>

        {preview && "error" in preview ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {preview.error}
          </div>
        ) : null}

        {preview && "ok" in preview ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium">{preview.fileName}</p>
              <p className="text-muted-foreground">
                연도 {preview.year} · 경고 {preview.warnings.length}건
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="명부 신규" value={preview.totals.rosterNew} />
              <Stat label="명부 갱신" value={preview.totals.rosterUpdated} />
              <Stat label="명부 동일" value={preview.totals.rosterUnchanged} />
              <Stat label="구독 신규" value={preview.totals.subsNew} />
              <Stat label="구독 갱신" value={preview.totals.subsUpdated} />
              <Stat label="구독 동일" value={preview.totals.subsUnchanged} />
            </div>

            {preview.warnings.length ? (
              <details className="rounded-md border px-4 py-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  경고 {preview.warnings.length}건
                </summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {preview.warnings.slice(0, 50).map((w, i) => (
                    <li key={i}>
                      <span className="font-mono text-muted-foreground">
                        row {w.rowIndex}
                      </span>{" "}
                      — {w.reason}
                    </li>
                  ))}
                  {preview.warnings.length > 50 ? (
                    <li className="text-muted-foreground">
                      … +{preview.warnings.length - 50}건
                    </li>
                  ) : null}
                </ul>
              </details>
            ) : null}

            <form action={runCommit} className="flex items-center gap-3">
              <input
                type="hidden"
                name="payload"
                value={JSON.stringify(preview.payload)}
              />
              <input type="hidden" name="fileName" value={preview.fileName} />
              <input type="hidden" name="year" value={preview.year} />
              <Button type="submit" disabled={commitPending}>
                {commitPending ? "반영 중…" : "확정 반영"}
              </Button>
              <span className="text-xs text-muted-foreground">
                확정 전까지 DB는 변경되지 않습니다.
              </span>
            </form>
          </div>
        ) : null}

        {commit && "error" in commit ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {commit.error}
          </div>
        ) : null}
        {commit && "ok" in commit ? (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            반영 완료 · 신규 {commit.counts.inserted} / 갱신{" "}
            {commit.counts.updated} / 동일 {commit.counts.skipped}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
