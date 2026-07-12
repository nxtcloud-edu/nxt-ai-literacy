# HTML 게임 배포 운영 프로그램

수강생이 소속·이름과 HTML 파일을 제출하면 업로드된 게임의 접속 URL을 발급하는 단일 Express 앱입니다.

## 로컬 DRY_RUN 운영

S3_BUCKET을 비워 두면 클라우드 호출 없이 `.local-deploy/`에 파일을 저장하고 앱이 직접 정적 서빙합니다.

```bash
cd html-delivery
npm install
cp .env.example .env
npm start
```

브라우저에서 `http://localhost:3210`을 열고 소속, 이름, `.html` 파일을 제출합니다. 성공하면 발급된 URL로 업로드 파일을 그대로 열 수 있습니다. 업로드 기록은 `uploads.log.jsonl`에 JSONL로 추가됩니다.

## S3 전환

Terraform이 S3 버킷·웹사이트 설정·퍼블릭 읽기 정책을 관리합니다. `infra/README.md`의 검증자/운영자 절차를 따라 Terraform output의 `s3_website_endpoint`를 `BASE_URL`로 설정합니다. S3 모드에서 발급 URL은 `${BASE_URL}/${key}`이고, DRY_RUN에서는 기존 `${BASE_URL}/deployed/${key}`를 사용합니다.

S3 객체에는 `affiliation`, `name`, `uploadedAt` Metadata와 `text/html; charset=utf-8` Content-Type이 설정됩니다. S3 Metadata는 ASCII 규칙에 맞도록 `encodeURIComponent` 값으로 저장하므로, 운영 도구에서 소속·이름을 표시할 때 `decodeURIComponent`로 복원합니다.

## API

- `GET /api/health` → `{ "ok": true }`
- `POST /api/upload` multipart 필드 `affiliation`, `name`, `file` → `201 { url, key, uploadedAt }`
- 파일은 `.html`만 허용하며 최대 1MB, 소속·이름은 trim 후 각각 1~40자입니다.

## 테스트

```bash
npm test
```

실 S3 호출, 버킷 생성, AWS CLI 실행은 이 작업의 검증 범위가 아닙니다.
