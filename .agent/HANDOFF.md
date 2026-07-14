# Handoff

## Current handoff summary
WO-025(관리자 UI·infra)는 검증·main 머지·terraform apply·프로덕션 실측까지 완료되어 개통됨
(`https://showcase.nxtcloud.kr/admin.html`, noindex·갤러리 미링크). main HEAD=`d38d8ea`.

WO-026 발행: 공개 갤러리 4개 페이지(index·cohort·upload·view) 하단에 공통 푸터를 추가하고
그 안에 저채도 '관리자' 링크로 `/admin.html` 진입점을 노출한다. 사용자 확정 = 푸터의 작은 muted 링크.
Coder(Hermes)는 `wo/026` 브랜치에서 작업.

## Next recommended project actions (Coder = Hermes)
1. WO-026 설계 결정대로 theme.css 푸터·admin-link 규칙 추가(신규 규칙만) + 4개 페이지 마크업 삽입
2. DRY_RUN 브라우저 실측 4개 한정(라이트/다크 렌더·관리자 이동·타 페이지 노출·모바일 줄바꿈)
3. npm test 그린, 커밋 분리(마크업/스타일), TURN_LOG 완료 헤더 + wo/026 커밋
4. 검증(Claude): 재검증 통과 시 main 머지 + Lambda 재배포

## Collision risks
- 실 AWS 호출·terraform plan/apply·aws CLI·push·main 머지·배포는 Coder 수행 금지 (검증자 전담)
- 헤더(site-nav)·서버 코드·infra·admin.html 수정 금지
- theme.css 기존 줄 수정 금지(신규 규칙만 추가), 새 색상 하드코딩 금지

## 잔여 권고 (WO 아님)
- 관리자 비밀번호가 팀 공통 비번(12345678aA)과 동일 — 회전 권고(tfvars 교체 + apply). 사용자 결정 대기.
