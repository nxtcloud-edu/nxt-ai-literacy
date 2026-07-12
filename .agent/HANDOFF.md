# Handoff

## Current handoff summary
WO-004는 Lambda 전환 결정으로 폐기됐다. WO-005에서 업로드 앱을 EC2에서 Lambda Function URL로 전환했으며, S3 정적 웹사이트는 유지한다. 스펙은 `.agent/work-orders/WO-005-lambda-migration.md`가 SSOT다.

## First things to do before any next edit
```bash
git status --short --branch
git log -4 --pretty=format:'%h %s'
```

## Next recommended project actions
1. (Hermes) WO-005 완료 신호 확정 — TURN_LOG 완료 헤더 + 상태 커밋
2. (Claude) 앱·인프라·문서 커밋 분리 및 Terraform/Lambda 재검증 → 통과 시 main 머지
3. (Claude+사용자) `npm install --omit=dev` 후 Terraform apply, Function URL health/upload 및 S3 발급 URL 실측

## Collision risks
- `archive_file`은 로컬 `html-delivery/node_modules`를 ZIP에 포함하므로 apply 전 운영 의존성 설치가 필수
- Lambda Function URL은 인증 없는 공개 엔드포인트이며 현재 제품 결정에 따른 구성
- coder는 `terraform plan/apply`, `aws` CLI, AWS 자격 파일 읽기를 실행하지 않음
- main 워크트리의 로컬 Terraform state/plan은 검증자 소유이므로 coder가 건드리지 않음
