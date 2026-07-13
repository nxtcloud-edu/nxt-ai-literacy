# Handoff

## Current handoff summary
WO-017에서 `showcase.nxtcloud.kr`용 ACM 인증서를 us-east-1에 생성·DNS 검증하고, Lambda Function URL을 custom origin으로 쓰는 CloudFront와 Route53 A/AAAA alias를 정의했다. 기본 behavior는 CachingDisabled, assets는 CachingOptimized이며 양쪽 모두 managed `AllViewerExceptHostHeader`를 사용해 Lambda URL로 viewer Host를 전달하지 않는다. 앱 발급 URL은 `APP_BASE_URL`을 최우선 사용한다.

## Verification evidence
- `node --test test/validation.test.js`: 11/11 통과
- `npm test`: 17/17 통과
- `terraform -chdir=infra init -backend=false`: 성공, aws v5.100.0/archive v2.8.0 재사용
- `terraform -chdir=infra fmt -check`: 통과
- `terraform -chdir=infra validate`: `Success! The configuration is valid.`
- managed policy는 name data source 사용; 양 behavior에서 AllViewerExceptHostHeader 참조 2건
- `X-Forwarded-Host`·legacy `forwarded_values` 없음
- Lambda Function URL·permission 유지
- plan/apply·aws CLI·클라우드 접속 실행 안 함

## Commits
- `a150a66 feat: 발급 URL에 APP_BASE_URL 우선 적용`
- `e8cc59c feat: CloudFront 커스텀 도메인 인프라 추가`
- 상태·저널 문서 커밋은 현재 HEAD `docs: WO-017 커스텀 도메인 검증 인계`

## Next recommended project actions
1. 검증자가 plan에서 인증서 us-east-1, distribution origin domain, DNS 레코드 변경을 확인
2. apply 후 ACM 검증 완료·CloudFront Deployed·Route53 해석 대기
3. `https://showcase.nxtcloud.kr` health, upload 반환 URL, feedback/like POST, `/assets/*`를 E2E 검증

## Collision risks
- hosted zone은 `name = "nxtcloud.kr."`, `private_zone = false` data lookup; 계정 내 동일 이름 public zone이 하나라는 전제
- CloudFront 생성·ACM 검증은 apply 시 시간이 걸림
- 직접 Lambda Function URL 접근은 의도적으로 유지
- 실제 plan/apply·프로덕션 접속·push 미실행
