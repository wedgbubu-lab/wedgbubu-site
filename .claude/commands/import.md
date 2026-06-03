# Phase 06 — import 스키마 보강 (조건부)

**목표:** roster/import_batches와 subscriptions FK·유니크 제약.
**참고:** Phase 02에서 전체 스키마를 만들었다면 **건너뛴다.**

## 명령
```
(Phase 02에 포함되지 않았다면) subscriber_roster·import_batches 테이블과 subscriptions의
roster_id FK, (roster_id, year, month) 유니크 제약을 추가하는 마이그레이션을 만들어줘.
RLS는 roster/import_batches 모두 admin 전용.
```

## 완료 기준
- [ ] (해당 시) roster/import_batches 생성 및 RLS 적용