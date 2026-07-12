# Handoff

## Current handoff summary
WO-011에서 추천·피드백 POST에 Lambda 인스턴스별 in-memory 슬라이딩 윈도우 제한을 적용했다. 기존 콘텐츠 버전업은 DynamoDB `UpdateCommand`/로컬 필드 병합으로 최신 버전 3개 필드만 갱신해 likes를 보존한다. `/play` 프록시와 S3 website 리소스를 제거하고, S3 모드 iframe·직접 URL을 별도 HTTPS REST 오리진으로 통일했다.

## Verification evidence
- `npm test`: 15/15 통과
- `terraform -chdir=infra fmt -check`: 통과
- `terraform -chdir=infra validate`: 구성 valid
- DRY_RUN 추천 4연타: 200·200·200·429, 429 지정 문구 확인
- DRY_RUN 피드백 6연타: 201×5·429, 429 지정 문구 확인
- v1 추천 3회 후 v2: contentId 불변, latestVersion 2, likes 3 보존
- `/play/games/{id}-v2.html`: 404
- `/play`, S3 website resource/output, `GetObjectCommand` 잔존 검색: 0건
- 서버 종료 및 정확한 artifact·registry·feedback·임시 자격/응답 fixture 정리 완료

## Commits
- `83c20a0 feat: 추천과 피드백 요청 속도 제한 추가`
- `1b2f6f6 fix: 버전 갱신 시 추천 수 보존`
- `fe08fae feat: S3 REST 오리진으로 콘텐츠 격리`
- 상태·저널 문서 커밋은 현재 HEAD `docs: WO-011 보안 하드닝 검증 인계`

## Next recommended project actions
1. rate limiter의 IP×contentId 3/min, IP 전체 30/min, feedback IP 5/min과 만료 정리 재검증
2. 기존 업로드가 PutItem 대신 UpdateItem만 수행하며 likes를 건드리지 않는지 재검증
3. main 머지 후 Terraform apply/Lambda 배포 및 프로덕션 HTTPS REST iframe/직접 URL 확인

## Collision risks
- rate limiter는 Lambda 인스턴스별 완화책이며 콜드스타트·다중 인스턴스 간 공유되지 않음
- 실제 AWS 호출, Terraform plan/apply, 배포, push 미실행
- 게임 파일·`html-delivery/lambda.js` 미수정
