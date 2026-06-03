# Phase 10 — 가입-명부 매칭

**목표:** 가입 시 이메일/연락처로 roster 연결 → 권한 활성화.
**규약:** `CLAUDE.md` 6번(매칭), 5번(게이팅).

## 명령
```
유저가 회원가입할 때 이메일 또는 연락처로 subscriber_roster를 찾아 user_id를 연결하는 로직을 추가해줘.
has_active_subscription()이 연결된 roster의 현재 연/월 구독을 보도록 맞추고,
investments 페이지 게이팅이 이 기준으로 동작하는지 확인해줘.
```

## 완료 기준
- [ ] 명부에 있는 사람 가입 시 user_id 연결
- [ ] 활성 구독자만 investments 열람