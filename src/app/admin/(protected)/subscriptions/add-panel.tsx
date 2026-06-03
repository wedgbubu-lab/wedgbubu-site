"use client";

import { useActionState } from "react";
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
import { addSubscription } from "./actions";
import type { AddSubState } from "./types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function AddPanel({ defaultYear }: { defaultYear: number }) {
  const [state, runAdd, pending] = useActionState<AddSubState, FormData>(
    addSubscription,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>구독 추가</CardTitle>
        <CardDescription>
          이름·연락처와 적용할 월을 선택해 한 번에 추가합니다. 같은 연락처가 이미 있으면 명부는 갱신만 됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={runAdd} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="space-y-2 sm:col-span-4">
              <Label htmlFor="add-name">이름</Label>
              <Input id="add-name" name="name" placeholder="홍길동" />
            </div>
            <div className="space-y-2 sm:col-span-4">
              <Label htmlFor="add-phone">연락처 *</Label>
              <Input
                id="add-phone"
                name="phone"
                type="tel"
                required
                placeholder="010-1234-5678"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="add-year">연도 *</Label>
              <Input
                id="add-year"
                name="year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={defaultYear}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="add-status">상태 *</Label>
              <select
                id="add-status"
                name="status"
                defaultValue="active"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="active">active</option>
                <option value="challenge">challenge</option>
                <option value="expired">expired</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>구독월 *</Label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {MONTHS.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    name="months"
                    value={m}
                    className="size-3.5"
                  />
                  <span>{m}월</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              여러 월을 한 번에 체크할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "추가 중…" : "추가"}
            </Button>
            {state && "error" in state ? (
              <span className="text-sm text-destructive">{state.error}</span>
            ) : null}
            {state && "ok" in state ? (
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {state.phone} · {state.addedMonths.join(", ")}월 반영
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
