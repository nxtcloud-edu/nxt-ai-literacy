# WO-014: 로고 에셋 캐시 버스팅
상태: 대기
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/014` 브랜치

## 목표
WO-013의 바이너리 수정 이전에 손상된 로고 응답이 방문자 브라우저 HTTP 캐시에 남아
ETag 304로 재사용됨 (근거: GOTCHAS.md 1·2번). 캐시 키를 바꿔 전 방문자에게 정상 로고가 보이게 한다.

## 설계 결정 (변경 금지)
1. 4개 HTML의 로고 `<img src>`·파비콘 `<link href>`를 전부 `/assets/nxtcloud-logo.png?v=2`로.
2. 다른 변경 금지 — 이 WO는 URL 버전 쿼리만.

## 완료 기준
- [ ] 4개 페이지의 img·favicon 참조가 전부 `?v=2`, 그 외 diff 없음
- [ ] TURN_LOG 완료 헤더 + wo/014 커밋 1개
