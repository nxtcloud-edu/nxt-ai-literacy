# Handoff

## Current handoff summary
WO-001(run-game ver1)은 검증 통과로 main에 머지 완료. WO-002(html-delivery)가 발행되어
Hermes가 `wo/002` 브랜치에서 작업한다. 스펙은 `.agent/work-orders/WO-002-html-delivery.md`가 SSOT.
핵심 제약: 실 S3 호출·클라우드 접근은 코더 금지 — DRY_RUN 모드로 전체 플로우를 로컬 검증한다.

## First things to do before any next edit
```bash
git status --short --branch
git log -1 --pretty=format:'%h %s'
```

## Next recommended project actions
1. (Hermes) WO-002 수행 — 완료 시 TURN_LOG 완료 헤더 + wo/002 커밋
2. (Claude) 완료 신호 감지 → DRY_RUN 실측 검증 → main 머지
3. (Claude+사용자) S3 버킷 프로비저닝 및 실배포 검증 → 수강생 안내 문서 작성

## Collision risks
- Hermes는 기본 모드 구동 — dangerous-command 프롬프트는 60초 내 사람이 tmux attach로 승인 필요 (Gotcha 8)
- html-delivery 서버 포트는 3210 사용 (3111 회피 — agent-share Gotcha). 검증 후 프로세스 정리
- 브라우저 실측 시 MCP 탭 visibility hidden이면 rAF 정지 — JS 펌핑으로 전환 (agent-share Gotcha 14)
