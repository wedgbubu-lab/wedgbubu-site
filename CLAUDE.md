# CLAUDE.md

이 문서는 Claude Code가 이 프로젝트에서 작업할 때 따라야 할 컨벤션과 컨텍스트를 정의한다.
새 작업을 시작하기 전에 항상 이 문서를 먼저 참고한다. 단계별 실행 절차는 `COMMANDS.md`를 따른다.

---

## 1. 프로젝트 개요

부수입(재테크/투자) 정보 제공 서비스.
- **관리자(Admin)** 는 회원/구독을 관리하고 투자정보 게시물을 발행한다.
- **유저(User)** 는 랜딩페이지로 가입/로그인하고, 권한(활성 구독)이 있을 때만 투자정보를 열람한다.
- 구독 명부는 **엑셀/구글시트 업로드로 일괄 갱신**된다.

핵심 게이팅 규칙: **투자정보 열람 = 로그인 + 활성 구독(권한)**.

---

## 2. 기술 스택

| 영역 | 선택 |
|------|------|
| Frontend | Next.js 14+ (App Router), TypeScript |
| 스타일 | Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (이메일/비밀번호) |
| 권한 | PostgreSQL RLS + `profiles.role` + 활성 구독 |
| 데이터 import | SheetJS(`xlsx`) 파싱, (선택) Google Sheets API |
| 배포 | FE → Vercel, BE/DB → Supabase |

원칙: BE 로직은 가능한 한 DB(RLS, 함수, RPC)로 표현한다. 클라이언트는 신뢰하지 않는다.

---

## 3. 디렉토리 구조 (목표)

```
src/
  app/
    (public)/
      page.tsx                # 랜딩
      login/page.tsx          # 유저 로그인/가입
    (user)/
      investments/page.tsx    # 투자정보 (로그인 + 권한 필요)
    admin/
      login/page.tsx          # 어드민 로그인
      users/page.tsx          # 유저 관리
      subscriptions/page.tsx  # 구독 관리 + 엑셀 업로드
      posts/page.tsx          # 발행 게시물 일자별 게시판
      layout.tsx              # 어드민 가드 레이아웃
    api/                      # route handlers (cron 등)
  lib/
    supabase/{client,server,middleware}.ts
    import/
      parseRoster.ts          # 엑셀/시트 행 -> 정규화 (순수 함수)
      fetchSheet.ts           # (선택) Google Sheets API 읽기
  components/ui/              # shadcn/ui
  types/database.types.ts     # supabase gen types
middleware.ts                 # 라우트 가드(인증/역할)
supabase/migrations/          # SQL 마이그레이션
```

---

## 4. 데이터 모델

```
profiles                -- auth.users 1:1 확장
  id          uuid PK (= auth.users.id)
  email       text
  role        text     -- 'admin' | 'user' (기본 'user')
  full_name   text
  created_at  timestamptz default now()

subscriber_roster       -- 엑셀 명부 원본 (auth 유저와 매칭 대기)
  id          uuid PK
  name        text
  phone       text UNIQUE          -- 업서트 키 (이메일은 일부만 존재하므로)
  email       text
  user_id     uuid NULL FK -> profiles.id   -- 가입 시 연결
  raw         jsonb                -- 원본 행 보관(추적용)
  updated_at  timestamptz default now()

subscriptions           -- 월 단위 구독 레코드 (명부에서 펼쳐짐)
  id          uuid PK
  roster_id   uuid FK -> subscriber_roster.id
  user_id     uuid NULL FK -> profiles.id
  year        int
  month       int                  -- 1..12
  status      text                 -- 'active' | 'challenge' | 'expired'
  UNIQUE (roster_id, year, month)

import_batches          -- 업로드 이력/감사 로그
  id          uuid PK
  source      text     -- 'xlsx' | 'google_sheet'
  file_name   text
  row_count   int
  inserted    int
  updated     int
  skipped     int
  errors      jsonb
  created_by  uuid FK -> profiles.id
  created_at  timestamptz default now()

posts                   -- 발행 게시물 (투자정보)
  id            uuid PK
  title         text
  content       text
  category      text
  is_published  boolean default false
  published_at  timestamptz        -- 일자별 정렬 기준
  author_id     uuid FK -> profiles.id
  created_at    timestamptz default now()
```

권한 판단 헬퍼(SQL function 권장):
- `is_admin(uid)` → `profiles.role = 'admin'`
- `has_active_subscription(uid)` → 해당 유저(또는 매칭된 roster)에 현재 연/월 기준 `status='active'` 행 존재

---

## 5. RLS 정책 (필수)

모든 테이블에서 RLS를 **항상 ON**으로 둔다.

- **profiles**: 본인 row select/update. admin은 전체.
- **subscriber_roster / import_batches**: **admin만** select/insert/update/delete.
- **subscriptions**: 본인(연결된 user_id) select. 쓰기는 admin/RPC만.
- **posts**:
  - select: `is_published=true` AND (`has_active_subscription(auth.uid())` OR `is_admin(auth.uid())`)
  - insert/update/delete: admin만.

> ⚠️ UI 가드는 UX용이고, 실제 보안은 RLS가 책임진다. 클라이언트 쿼리로만 막지 않는다.

---

## 6. 데이터 Import / 동기화 규칙

엑셀(웨지부부 구독 명부) 실제 형태에 맞춘다.
- 명부는 **가로형(wide)**: `이름, 연락처, 이메일, 1월~12월(값 'O' 또는 '챌린지')` 등.
- **연락처(전화번호)가 업서트 키**. 이메일은 절반만 존재하므로 보조키.
- 월별 컬럼은 **세로로 펼쳐(normalize)** `subscriptions(year, month, status)` 행으로 변환.
  - `'O'` → `active`, `'챌린지'` → `challenge`, 빈칸 → 레코드 없음.
- `Yes/No Claude`, 빈/쓰레기 컬럼은 무시. 원본 행은 `subscriber_roster.raw(jsonb)`에 보관.

파이프라인: **업로드 → 파싱/정제(`parseRoster`) → 미리보기(신규/갱신/스킵/경고) → 관리자 확정 → RPC로 트랜잭션 업서트 → `import_batches` 기록**. 같은 파일 재업로드 시 중복이 없어야 한다(연락처 기준 idempotent).

회원가입 흐름: 명부에 있다고 계정이 생기지 않는다. 유저가 가입하면 **이메일/연락처로 roster를 매칭해 `user_id` 연결** → 그때 권한 활성화.

구글시트: (A) 시트를 .xlsx로 내보내 동일 업로드 기능 사용(MVP). (B) Google Sheets API + 서비스 계정으로 주기 동기화(Vercel Cron). `parseRoster`를 공유한다.

---

## 7. 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # 서버 전용. NEXT_PUBLIC_ 금지, 클라이언트 번들 금지.
GOOGLE_SERVICE_ACCOUNT_JSON=   # (선택 B) 시트 동기화용. 서버 전용.
GOOGLE_SHEET_ID=               # (선택 B)
```
- `service_role` / 구글 키는 서버 액션·route handler·cron에서만 사용. `.env*`는 커밋 금지.

---

## 8. 코딩 컨벤션

- TypeScript strict, `any` 지양. DB 타입은 `supabase gen types`로 생성.
- 데이터 패칭은 서버 컴포넌트/서버 액션 우선. 클라이언트 컴포넌트는 인터랙션 한정.
- 뮤테이션은 Server Actions + `revalidatePath`. 여러 테이블을 묶는 쓰기는 **Postgres RPC(트랜잭션)**.
- `parseRoster`는 외부 의존 없는 **순수 함수** + 단위 테스트.
- 스타일은 Tailwind 우선, 반복 UI는 `components/ui`로 추출.

---

## 9. 작업 체크리스트

1. SQL 변경은 `supabase/migrations/`에 파일로 남긴다.
2. 테이블 추가 시 RLS를 켜고 정책을 함께 작성한다.
3. 스키마가 바뀌면 DB 타입을 재생성한다.
4. 비밀키가 클라이언트 번들에 들어가지 않는지 확인한다.
5. import는 미리보기 → 확정 2단계, 재업로드 idempotent를 보장한다.
6. 권한 경계(어드민/구독/미발행글)별 동작을 수동 검증한다.

---

## 10. 비범위 (지금은 하지 않음)

- 결제(PG) 연동 — 구독 status는 명부 업로드/어드민 수동 관리로 시작.
- 다국어, 이메일 발송, 소셜 로그인 — 추후.