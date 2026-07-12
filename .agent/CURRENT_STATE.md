# Current State

Updated: 2026-07-12 16:11 KST

## Active owners
- Hermes (Coder): WO-006 수강생용 루트 README 작성·검증 완료, 검증 대기 (`wo/006` 브랜치)
- Claude (Planner): README 내용·링크·변경 경계 재검증 및 머지 판정 대기

## Last verified repo state
- Branch: wo/006 / 수강생 안내 README와 상태·저널 커밋 완료
- 검증: Markdown 상대 링크 4개 실물 일치; 6개 섹션 순서·필수 문구·금지어 검사 통과; 제품 변경은 신규 루트 README 1개

## Completed
- 협업 인프라 셋업 (저널·명령서 채널·워크트리 게이트·tmux 세션)
- 제품 방향 확정: 3폴더 구조, 게임=수강생 실습 소재(선제 개선 금지), 배포 인프라=S3 정적 호스팅
- box-game/game-ver1.html 배치
- **WO-001 완료**: run-game/game-ver1.html
- **WO-002 완료**: html-delivery 업로드·배포 운영 프로그램
- **WO-003 완료**: Terraform S3+EC2 인프라
- **WO-004 폐기**: EC2 서브넷 변수화 (Lambda 전환 결정)
- **WO-005 완료**: Lambda Function URL 전환, 프로덕션 E2E 성공

## In progress
- WO-006: 수강생 안내 문서 (`wo/006`)

## Next safe action
1. Hermes 완료 신호(`wo/006` 커밋 + TURN_LOG 완료 헤더) 확정
2. Claude가 README 6개 섹션·링크·금지 경계를 재검증
3. 통과 시 main 머지
