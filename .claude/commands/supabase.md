# Phase 01 — Supabase 연동 셋업

**목표:** Supabase 클라이언트/서버/미들웨어 헬퍼와 env 템플릿.
**규약:** `CLAUDE.md` 7번.

## 명령
```
@supabase/supabase-js와 @supabase/ssr를 설치하고, CLAUDE.md 7번 환경변수 규약에 맞춰
.env.example을 만들어줘. lib/supabase/client.ts(브라우저), server.ts(서버),
middleware.ts(세션 갱신 헬퍼)를 작성하고 service_role은 서버 전용임을 주석으로 명시해줘.
```

## 수동 작업
- Supabase 대시보드에서 프로젝트 생성
- URL / anon / service_role 키를 `.env.local`에 입력

## 완료 기준
- [ ] 세 개의 클라이언트 파일 생성
- [ ] `.env.local` 채움, 빌드 통과