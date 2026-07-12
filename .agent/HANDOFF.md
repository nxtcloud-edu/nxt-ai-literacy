# Handoff

## Current handoff summary
빈 프로젝트에 멀티 에이전트 협업 인프라(full 모드)를 셋업했다. Hermes 코더는
`../nxt-ai-literacy-hermes` 워크트리에서 tmux 세션 `ai-literacy-hermes`로 대기 중.
아직 제품 코드와 첫 작업 정의가 없다 — 다음 액션은 첫 WO 발행이다.

## First things to do before any next edit
```bash
git status --short --branch
git log -1 --pretty=format:'%h %s'
```

## Next recommended project actions
1. 프로젝트 목표·산출물 정의 (사용자)
2. `.agent/work-orders/WO-001-*.md` 발행 (Claude)
3. `tmux-send-safe.sh ai-literacy-hermes "WO-001 진행해" --enter` 로 착수 지시

## Collision risks
- 로컬 포트·DB·도커는 워크트리 간 공유 — 전 스위트는 한 번에 하나만
- Hermes는 기본 모드 구동 — dangerous-command 프롬프트는 60초 내 사람이 tmux attach로 승인 필요 (Gotcha 8)
