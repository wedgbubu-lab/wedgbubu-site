# Phase 05 — 어드민 측 페이지

**목표:** 어드민 4페이지 + 역할 가드 레이아웃.
**규약:** `CLAUDE.md` 3번, 8번.

## 명령
```
어드민 페이지를 만들어줘. admin/layout.tsx에 역할 가드를 넣고:
(1) admin/login (2) admin/users: profiles 조회/검색, role 변경
(3) admin/subscriptions: roster/구독 목록과 status/plan 수정
(4) admin/posts: 작성/수정/발행 토글 + published_at 기준 일자별 게시판.
모든 뮤테이션은 서버 액션 + revalidatePath.
```

## 완료 기준
- [ ] 어드민 4페이지 동작, 비-admin 차단
- [ ] posts 발행 토글 + 일자별 정렬