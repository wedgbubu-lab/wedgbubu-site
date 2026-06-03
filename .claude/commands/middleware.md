# Phase 03 — 라우트 가드(미들웨어)

**목표:** 인증/역할 기반 라우트 보호.
**규약:** `CLAUDE.md` 6번, 5번.

## 명령
```
middleware.ts를 작성해줘. CLAUDE.md 6번/5번 규칙대로 /admin/*는 로그인+role='admin',
/investments는 로그인 필요, 랜딩과 로그인 페이지는 공개로 처리하고,
권한 없을 때 리다이렉트 경로도 규약대로.
```

## 완료 기준
- [ ] 비로그인 /admin 접근 시 /admin/login으로 리다이렉트
- [ ] 비로그인 /investments 접근 시 /login으로 리다이렉트