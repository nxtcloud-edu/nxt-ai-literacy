# Terraform 인프라

`html-delivery` 실배포용 S3 정적 웹사이트와 EC2 업로드 앱을 Terraform으로 관리합니다.

## 구성

- S3 단일 버킷: 웹사이트 호스팅, 퍼블릭 `s3:GetObject`, 업로드 객체 저장
- EC2 `t3.micro`: Amazon Linux 2023 최신 AMI, 포트 80만 공개
- IAM: SSM Session Manager 관리형 정책과 해당 버킷 `games/*` 대상 `s3:PutObject` 최소 권한
- EC2 user-data: Node.js 20·git 설치 → 공개 GitHub 저장소 clone → `npm install` → systemd로 포트 80 기동
- 비용 절약: WAF, CloudFront, Route 53, 커스텀 도메인, 오토스케일링, 원격 Terraform backend와 SSH(22)는 만들지 않습니다.

## 검증

Terraform 1.5.7 기준으로 실행합니다. 코더 작업에서 허용된 명령은 아래 세 가지뿐입니다.

```bash
terraform -chdir=infra init -backend=false
terraform -chdir=infra fmt -check
terraform -chdir=infra validate
```

`init -backend=false`는 원격 state를 만들지 않습니다. AWS 자격 증명이나 `terraform.tfvars`가 없어도 구문·스키마 검증이 가능해야 합니다.

## 적용·배포 (검증자/운영자 전용)

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars
terraform -chdir=infra apply
terraform -chdir=infra output
```

적용 후 Terraform output의 `s3_website_endpoint`는 학생 게임 URL의 기반이 되고, `upload_app_url`은 업로드 폼 주소입니다. EC2 user-data가 공개 저장소의 최신 코드를 clone하므로 별도 수동 파일 복사는 하지 않습니다.

이 작업의 코더는 `terraform plan`, `terraform apply`, `aws` CLI를 실행하지 않습니다. AWS 자격 파일도 읽지 않습니다.
