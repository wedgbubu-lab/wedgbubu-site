# Phase 07 — 파싱/정제 라이브러리

**목표:** 엑셀 행을 정규화하는 순수 함수 `parseRoster`.
**규약:** `CLAUDE.md` 6번, 8번. 실제 엑셀 컬럼: 이름·연락처·이메일·1~12월('O'/'챌린지').

## 명령
```
SheetJS(xlsx)를 설치하고 lib/import/parseRoster.ts를 순수 함수로 만들어줘.
입력 ArrayBuffer. 1행 헤더에서 이름/연락처/이메일/1~12월만 추출,
연락처는 하이픈·공백 제거 정규화, 이름 없는 행 스킵,
월 셀 'O'→active / '챌린지'→challenge / 그 외·빈칸 무시.
반환 { roster[], subscriptions[], warnings[] }. 단위 테스트도 같이.
```

## 완료 기준
- [ ] 샘플 파일로 파싱·테스트 통과
- [ ] 연락처 정규화/스킵 규칙 동작