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

1. AWS 표준 자격 증명 체인을 준비합니다. `AWS_PROFILE` 등으로 지정하며 키를 코드나 저장소에 넣지 않습니다.
2. `S3_BUCKET`, `S3_REGION`, `BASE_URL`을 `.env`에 설정합니다.
3. 운영자가 아래 프로비저닝 스크립트를 검토·실행합니다. 이 저장소의 Coder 작업에서는 실행하지 않습니다.

```bash
./scripts/provision-s3.sh <bucket-name> <region>
```

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
