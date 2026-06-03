# Phase 12 — 검증 & 배포

**목표:** 권한 경계 검증 + Vercel 배포.
**규약:** `CLAUDE.md` 9번 체크리스트.

## 명령
```
권한 경계 점검: 일반 유저의 /admin 차단, 구독 없는 유저의 investments 게이팅,
미발행 글 비노출, 같은 엑셀 재업로드 시 중복 없음(idempotent)을 확인하는
수동 테스트 시나리오와 체크리스트를 정리해줘. Vercel 배포용 환경변수 목록과 설정 순서도.
```

## 수동 작업
- GitHub 푸시 → Vercel import → 환경변수 등록 → 배포
- Supabase Auth의 Site/Redirect URL에 Vercel 도메인 추가

## 완료 기준
- [ ] 4가지 권한 경계 테스트 통과
- [ ] 프로덕션 배포 + 로그인 동작