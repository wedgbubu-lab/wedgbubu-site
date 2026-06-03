# Phase 09 — 확정 업서트 + 이력 (RPC/트랜잭션)

**목표:** 트랜잭션 업서트와 import_batches 기록, idempotent 보장.
**규약:** `CLAUDE.md` 6번, 8번(RPC).

## 명령
```
확정 처리를 Postgres RPC로 만들어줘: subscriber_roster를 phone 기준 upsert,
월별 데이터를 (roster_id, year, month) 기준으로 subscriptions에 upsert,
import_batches에 source/건수/경고 기록. 전체를 하나의 트랜잭션으로 묶어 실패 시 롤백.
서버 액션은 이 RPC만 호출하게 해줘.
```

## 완료 기준
- [ ] 확정 시 roster/subscriptions 반영, import_batches 기록
- [ ] 같은 파일 재업로드 시 중복 없음