#!/bin/sh
# 코더 완료 신호 워처. 완료 = "새 커밋 + 커밋된 TURN_LOG에 완료 헤더" 복합 조건.
# (상태 줄 단독·워킹트리 파일 grep은 조기 오탐 — 반드시 git show HEAD 스냅샷 기준)
# exit 0 = 완료 감지 / exit 2 = tmux 정체(승인 프롬프트 등) 감지
# 사용: watcher.sh <coder-worktree> "<완료 헤더 식별자>" [--tmux <session>] [--interval <sec>]
set -eu
WT=${1:?coder worktree 경로}; SIGNAL=${2:?완료 헤더 식별자}; shift 2
TMUX_SESSION=""; INTERVAL=15
while [ $# -gt 0 ]; do case "$1" in
  --tmux) TMUX_SESSION=${2:?}; shift 2 ;;
  --interval) INTERVAL=${2:?}; shift 2 ;;
  *) echo "알 수 없는 인자: $1" >&2; exit 2 ;;
esac; done

BASE=$(git -C "$WT" rev-parse HEAD)
echo "워처 시작: $WT (신호='$SIGNAL', base=$BASE)"
STALL_COUNT=0; LAST_PANE=""

while :; do
  HEAD=$(git -C "$WT" rev-parse HEAD)
  if [ "$HEAD" != "$BASE" ]; then
    # 커밋된 TURN_LOG의 완료 헤더 라인만 검사 (헤더 고정 + -F 리터럴)
    if git -C "$WT" show "$HEAD:.agent/TURN_LOG.md" 2>/dev/null | grep '^## ' | grep -qF "$SIGNAL"; then
      echo "완료 신호: $(git -C "$WT" log -1 --format='%h %s')"
      exit 0
    fi
  fi
  if [ -n "$TMUX_SESSION" ]; then
    PANE=$(tmux capture-pane -t "$TMUX_SESSION" -p 2>/dev/null | tail -8 || true)
    if echo "$PANE" | grep -qE "Timeout — denying|승인해 주세요|차단되어"; then
      echo "tmux 정체 감지 (승인 대기/차단)"; exit 2
    fi
    if [ "$PANE" = "$LAST_PANE" ] && echo "$PANE" | grep -q "❯"; then
      STALL_COUNT=$((STALL_COUNT+1))
      # 유휴 프롬프트가 40회(기본 10분) 연속 무변화면 정체로 판단
      [ $STALL_COUNT -ge 40 ] && { echo "tmux 정체 감지 (장시간 유휴)"; exit 2; }
    else
      STALL_COUNT=0
    fi
    LAST_PANE=$PANE
  fi
  sleep "$INTERVAL"
done
