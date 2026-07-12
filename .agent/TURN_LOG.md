# Turn Log

Append-only log of meaningful agent turns. Keep entries concise and factual.

- 읽기: 턴 시작 시 최근 엔트리만 tail로 읽는다. 현재 상태의 출처는 CURRENT_STATE / HANDOFF.
- 로테이션: 500줄 초과 시 검증자가 `TURN_LOG-archive-<yyyymm>.md`로 이관 (최근 10턴만 유지) —
  단, 모든 WO 브랜치가 main에 머지된 시점에만 (merge=union은 truncate를 부활시킨다).

---

## 2026-07-12 14:11 KST — claude (Planner) — 협업 인프라 셋업

### Intent
- 빈 프로젝트에 agent-share full 모드 인프라 구축 (저널·명령서 채널·워크트리 게이트·tmux 코더 세션)

### Files changed
- `.agent/` 저널 4종 + `work-orders/` 채널 — 템플릿에서 생성 후 프로젝트에 맞게 작성
- `AGENTS.md` — 에이전트 공통 규칙 (Planner=Claude, Coder=Hermes)
- `.gitattributes` — TURN_LOG merge=union

### Commands / verification
- `git init -b main` — 저장소 초기화
- `setup-worktree.sh` — hermes 워크트리 + 가드 훅 (이 턴에서 실행)
- `tmux new-session -s ai-literacy-hermes` — hermes --yolo 기동 (이 턴에서 실행)
- 테스트: 실행 안 함 — 아직 제품 코드 없음

### Decisions / assumptions
- 세션명은 사용자 지정 `ai-literacy-hermes` (스킬 기본 `<agent>` 명명 대신)
- hermes는 --yolo 구동 — 워크트리 격리 + push 차단 훅 전제 (Gotcha 8)

### Handoff
- 사용자가 첫 작업을 정의하면 Claude가 WO-001 발행 → tmux-send-safe.sh로 착수 지시

### Addendum (2026-07-12 14:16 KST)
- 정정: hermes는 `--yolo`가 아니라 **기본 모드**로 기동 — Claude Code 권한 분류기가 --yolo 기동을
  거부(사용자 명시 승인 없음). dangerous-command 프롬프트 발생 시 사람이 `tmux attach -t ai-literacy-hermes`로
  직접 승인. 무인 루프가 필요해지면 사용자 승인 후 --yolo 전환.
- 게이트 실측: pre-commit 가드 (B) 기존 줄 수정 차단 exit 1 확인, 정상 append 통과 확인.
  main 브랜치는 플래너 워크트리가 점유 중이라 코더 워크트리에서 checkout 자체가 불가 (이중 방어).
