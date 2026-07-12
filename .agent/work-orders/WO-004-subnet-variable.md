# WO-004: EC2 서브넷 선택 변수화 (비대칭 라우팅 회피)
상태: 폐기 (2026-07-12 — EC2 제거(Lambda 전환) 결정으로 무의미해짐. 착수 전 폐기, 코드 변경 없음)
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/004` 브랜치 (README 규칙)

## 목표
실배포에서 발견된 네트워크 장애 수정. `data.aws_subnets.default.ids[0]`이 고른 서브넷의
명시 라우트 테이블이 0.0.0.0/0을 NAT 인스턴스로 보내는 환경(과거 실습 잔재)이라, 인바운드 80이
비대칭 라우팅으로 타임아웃됐다(실측: SG·NACL 정상, 서비스 정상 리스닝, 외부 SYN-ACK 미도달).
서브넷을 운영자가 지정할 수 있게 변수화한다.

## 설계 결정 (변경 금지)
1. `variables.tf`에 `subnet_id` 추가 — type string, default `""`,
   description "비우면 기본 VPC 첫 서브넷(주의: IGW 라우팅 보장 안 됨). IGW 라우팅 서브넷 지정 권장".
2. `main.tf` aws_instance: `subnet_id = var.subnet_id != "" ? var.subnet_id : data.aws_subnets.default.ids[0]`
3. `infra/terraform.tfvars.example`에 subnet_id 예시 추가.
4. `infra/README.md`에 한 문단: 서브넷의 라우트 테이블이 0.0.0.0/0 → IGW인지 확인하는 법
   (`aws ec2 describe-route-tables --filters Name=association.subnet-id,...`) + 비대칭 라우팅 증상.
5. Terraform 1.5.7 호환 유지.

## 컨텍스트 (필독 파일)
- `infra/main.tf`, `infra/variables.tf` — 수정 대상
- `.agent/TURN_LOG.md` 최신 검증 엔트리 — 장애 실측 경위

## 작업 단계
1. 위 4개 파일 수정
2. `terraform -chdir=infra fmt -check && terraform -chdir=infra validate` (init은 이미 됨, 필요시 -backend=false)
3. TURN_LOG 완료 헤더 + 상태 `검증 대기` + wo/004 커밋 (타입 접두사, 한 커밋 = 한 목적)

## 완료 기준
- [ ] validate·fmt 통과, 변수 기본값일 때 기존 동작과 동일 (하위 호환)
- [ ] TURN_LOG 완료 헤더 + wo/004에만 커밋

## 금지 사항
- 절대 금지 블록: terraform plan/apply·aws CLI 금지 (검증자가 tfvars로 서브넷 지정해 apply)
- 다른 리소스·파일 수정 금지 — 이 WO는 서브넷 변수화만
