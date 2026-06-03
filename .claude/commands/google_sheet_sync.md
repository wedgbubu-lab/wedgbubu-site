# Phase 11 — 구글시트 자동 동기화 (선택)

**목표:** Google Sheets API + 서비스 계정으로 주기 동기화.
**참고:** MVP는 건너뛰고 .xlsx 수동 업로드로 충분. `parseRoster` 재사용.

## 명령
```
구글 서비스 계정으로 Sheets를 읽는 lib/import/fetchSheet.ts를 만들고,
GOOGLE_SHEET_ID 시트를 동일한 parseRoster 파이프라인에 연결해줘.
Vercel Cron으로 매일 1회 동기화하는 route handler(api/sync)도 만들어줘.
키는 서버 환경변수로만, 시트는 서비스 계정에 뷰어로 공유.
```

## 수동 작업
- GCP에서 서비스 계정 생성 + Sheets API 활성화
- 시트를 서비스 계정 이메일에 뷰어로 공유
- 키 JSON / 시트 ID를 env에 등록

## 완료 기준
- [ ] cron 호출 시 시트 데이터로 동기화