# Handoff

## Current handoff summary
WO-001~019 완료·배포됨 (WO-004 폐기). 서비스는 https://showcase.nxtcloud.kr 프로덕션 가동 중.
다음 작업은 **WO-020 (콘텐츠 제목 필드)** — `.agent/work-orders/WO-020-content-title.md`가 SSOT.
코더 세션은 컨텍스트 압축 누적으로 /new 초기화됨 — 이 문서와 AGENTS.md가 온보딩 전부다.

## First things to do before any next edit
```bash
git status --short --branch
git log -1 --pretty=format:'%h %s'
```

## Next recommended project actions
1. (Hermes) wo/020 브랜치에서 WO-020 수행 — 완료 헤더 '## <일시> — hermes (Coder) — WO-020'
2. (Claude) 검증 → 머지 → 배포 → 8팀 데이터에 제목 주입

## Collision risks
- 검증 서버 포트 3210 (3111 금지), 백그라운드 프로세스는 턴 종료 전 정리
- 검증 명령은 단독 실행만 (긴 && 체인·node -e는 안전 게이트에 차단됨)
- 커밋: 한글 + 타입 접두사, 한 커밋 = 한 목적 (tidy 분리 — 미분리는 반려)
