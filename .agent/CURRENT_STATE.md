# Current State

Updated: 2026-07-12 15:59 KST

## Active owners
- Hermes (Coder): WO-005 Lambda 전환 구현·검증 완료, 검증 대기 (`wo/005` 브랜치)
- Claude (Planner): 앱·인프라·문서 분리 커밋 재검증 및 머지 판정 대기

## Last verified repo state
- Branch: wo/005 / Lambda 앱·인프라·문서·저널 4개 목적 커밋 완료
- 검증: Terraform 1.5.7 `fmt -check`, `validate` 통과; `npm test` 8건 통과; 추적 Terraform 소스 EC2 잔존 0건

## Completed
- 협업 인프라 셋업 (저널·명령서 채널·워크트리 게이트·tmux 세션)
- 제품 방향 확정: 3폴더 구조, 게임=수강생 실습 소재(선제 개선 금지), 배포 인프라=S3 정적 호스팅
- box-game/game-ver1.html 배치
- **WO-001 완료**: run-game/game-ver1.html (검증 통과, main 머지)
- **WO-002 완료**: html-delivery 업로드·배포 운영 프로그램 (검증 통과, main 머지)
- **WO-003 완료**: Terraform S3+EC2 인프라 및 S3 URL 수정 (실배포 검증 후 main 머지)
- **WO-004 폐기**: EC2 서브넷 변수화 (Lambda 전환 결정으로 미진행)

## In progress
- WO-005: 업로드 앱 EC2 → Lambda Function URL 전환 (`wo/005`)

## Next safe action
1. Hermes 완료 신호(`wo/005` TURN_LOG 완료 헤더 + 상태 커밋) 확정
2. Claude가 4개 커밋과 Terraform/Lambda 구성을 재검증 → 통과 시 main 머지
3. 이후: 검증자/사용자가 운영 의존성 설치 후 Terraform apply 및 실업로드 검증
