# Coordination Decisions

This file records decisions about how multiple agents coordinate in this repository.
Product decisions remain in docs/planning/DECISIONS.md.

## Decisions

| Date | Decision | Reason | Impact |
|---|---|---|---|
| 2026-07-12 | agent-share full 모드 채택 (저널+명령서+워크트리 게이트+tmux 직접 제어) | Planner(Claude)-Coder(Hermes) 분업 지속 예정, goods-bank 실증 패턴 재사용 | 미검증 코드의 main 진입을 훅이 물리 차단 |
| 2026-07-12 | Hermes를 `--yolo`로 구동 | dangerous-command TTY 프롬프트가 60초 타임아웃 자동 거부 (Gotcha 8) | 워크트리 격리+push 차단 훅이 전제 — 전제 해제 시 --yolo도 해제 |
| 2026-07-12 | tmux 세션명 `ai-literacy-hermes` (사용자 지정) | 다른 프로젝트의 hermes 세션들과 구분 | 워처·send-safe 호출 시 이 세션명 사용 |

<!-- 위반 기록도 여기: 주체 확정 후에만 공식 기재, 회고 문서로 재캘리브레이션 -->

## Open coordination questions
- <미결 질문>
