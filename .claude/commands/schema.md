# Phase 02 — DB 스키마 & RLS

**목표:** 전체 테이블·함수·트리거·RLS 마이그레이션.
**규약:** `CLAUDE.md` 4번(모델), 5번(RLS).

## 명령
```
CLAUDE.md 4번 데이터 모델과 5번 RLS를 구현하는 마이그레이션을 supabase/migrations/에 만들어줘.
profiles, subscriber_roster, subscriptions, import_batches, posts 테이블,
is_admin()/has_active_subscription() 함수, auth.users 가입 시 profiles 자동 생성 트리거,
각 테이블 RLS 정책을 포함해줘. subscriptions에 (roster_id, year, month) 유니크 제약을 넣어줘.
```

## 수동 작업
- SQL Editor 실행 또는 `supabase db push`
- `supabase gen types typescript` → `src/types/database.types.ts` 생성

## 완료 기준
- [ ] 5개 테이블 + 함수/트리거/RLS 적용
- [ ] DB 타입 생성됨