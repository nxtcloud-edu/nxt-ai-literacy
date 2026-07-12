# Handoff

## Current handoff summary
WO-014에서 `index.html`, `cohort.html`, `upload.html`, `view.html`의 로고 img 및 favicon 총 8개 URL에 정확히 `?v=2`를 추가했다. 손상 응답을 보유한 기존 HTTP 캐시와 다른 키를 사용하기 위한 단일 목적 변경이다.

## Verification evidence
- `/assets/nxtcloud-logo.png?v=2`: 4개 HTML에서 총 8건
- 무버전 `nxtcloud-logo.png` img/favicon 참조: 0건
- `git diff --check`: 통과
- `npm test`: 16/16 통과
- HTML 외 제품 코드·자산 변경 없음

## Commit
- 현재 HEAD는 단일 목적 `fix: 로고 에셋 캐시 버스팅` 커밋

## Next recommended project actions
1. 4개 HTML의 img·favicon 각 2개 URL만 바뀌었는지 확인
2. 배포 후 브라우저 네트워크에서 `?v=2` 요청과 정상 PNG 렌더 확인

## Collision risks
- 실제 배포·프로덕션 접속·push 미실행
- 쿼리 버전 외 캐시 헤더나 파일 내용은 변경하지 않음
