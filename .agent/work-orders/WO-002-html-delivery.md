# WO-002: html-delivery 업로드·배포 운영 프로그램
상태: 검증 대기
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/002` 브랜치 (README 규칙)

## 목표
수강생이 **소속·이름과 함께 자기 html 파일을 업로드하면 자동으로 배포되어
실유저가 접속 가능한 URL을 발급**받는 운영 프로그램. 강사(운영자)가 수업장에서 기동한다.
근거: `docs/planning/DECISIONS.md` — "개발→배포→피드백→재개발" 사이클의 핵심 인프라,
배포 인프라는 AWS S3 정적 호스팅으로 확정.

## 설계 결정 (변경 금지)
1. **스택**: Node.js 20+ 단일 Express 앱. 의존성은 `express`, `multer`,
   `@aws-sdk/client-s3` 3개만 (내장 모듈 `crypto`·`node:test` 적극 사용). DB·Docker·프레임워크 금지.
2. **API-First**: `POST /api/upload` (multipart: `affiliation`, `name`, `file`) →
   `201 { url, key, uploadedAt }` JSON. `GET /api/health` → `{ ok: true }`.
   웹 폼(`public/index.html`)은 이 API의 한 클라이언트일 뿐이다.
3. **DRY_RUN이 기본 모드**: 환경변수 `S3_BUCKET` 미설정 시 S3 대신
   `html-delivery/.local-deploy/`에 저장하고 `http://localhost:{PORT}/deployed/{key}`로
   정적 서빙 — 클라우드 없이 업로드→URL 발급→접속 전 플로우가 로컬에서 완결된다.
   S3 경로는 코드만 작성하고 **호출·실행은 검증자 몫**.
4. **업로드 검증**: `.html` 확장자만, 최대 1MB, `affiliation`/`name` 필수(각 1~40자 트림).
   파일 내용은 무변조 그대로 저장 (수강생 코드 존중). 실패 시 4xx + 한국어 메시지 JSON.
5. **S3 key는 ASCII 전용**: `games/{yyyymmdd}-{hhmmss}-{rand4}.html`
   (한글 소속·이름은 key에 넣지 않는다 — URL 공유 편의). 소속·이름·key·URL·시각은
   `html-delivery/uploads.log.jsonl`에 append 기록 + S3 객체 Metadata에도 저장.
   업로드 객체 `Content-Type: text/html; charset=utf-8`.
6. **시크릿 규율**: AWS 자격은 표준 자격 체인(`AWS_PROFILE` 등)에 위임 — 코드·레포에
   자격·키 하드코딩 금지. `.env.example` 제공(`PORT`, `S3_BUCKET`, `S3_REGION`, `BASE_URL`),
   `.env`·`.local-deploy/`·`uploads.log.jsonl`은 `.gitignore`에 추가.
7. **포트 기본 3210** (`PORT` 환경변수로 변경 가능) — 3111 사용 금지.
8. **UI 룩앤필**: 게임들과 동일한 다크 톤 + monospace + 한국어. 폼(소속/이름/파일) →
   업로드 성공 시 발급 URL 표시 + 복사 버튼. 프레임워크·CSS 라이브러리 금지.
9. **버킷 프로비저닝은 스크립트 작성만**: `html-delivery/scripts/provision-s3.sh` —
   버킷 생성, 정적 웹사이트 호스팅 활성화, 퍼블릭 읽기 정책까지 aws CLI로. **절대 실행 금지**.

## 컨텍스트 (필독 파일)
- `docs/planning/DECISIONS.md` — 제품 방향·S3 확정 근거
- `run-game/game-ver1.html` — 다크 톤 룩앤필 참조 + DRY_RUN 검증용 업로드 샘플로 사용
- `AGENTS.md`(커밋 타입 접두사 규칙 추가됨), `.agent/work-orders/README.md` — 절대 금지 블록

## 작업 단계
1. `html-delivery/` 스캐폴딩: `package.json`, `server.js`(+필요시 `lib/` 분리), `public/index.html`,
   `.env.example`, `README.md`, `scripts/provision-s3.sh`
2. 업로드 검증 로직을 순수 함수로 분리하고 `node --test` 단위 테스트 작성
   (확장자·크기·필드 누락·트림 케이스)
3. DRY_RUN 저장·서빙 경로 구현 → S3 클라이언트 모듈(코드만) 구현
4. 실측: 서버 기동 후 curl로 성공 1건 + 실패 3건(비html/1MB 초과/필드 누락),
   발급 URL을 curl로 접속해 업로드한 html이 그대로 서빙되는지 확인 — Commands 전수 기재
5. README: 강사 운영 절차(로컬 기동→S3 전환), 프로비저닝 스크립트 안내
6. `node --test` 그린 + TURN_LOG(완료 헤더) + 상태 `검증 대기` (커밋은 wo/002에만)

## 완료 기준
- [ ] `npm install && node server.js`로 기동, DRY_RUN에서 업로드→URL 발급→URL 접속 시
      업로드한 게임이 그대로 열림
- [ ] `POST /api/upload` 성공·실패 4케이스 curl 실측 로그가 TURN_LOG에 전수 기재
- [ ] `node --test` 전체 그린
- [ ] 시크릿 하드코딩 없음, `.env.example` 존재, `.gitignore` 갱신
- [ ] 커밋 메시지 타입 접두사 + 한글 (WO-001 환류)
- [ ] TURN_LOG 완료 헤더(`## <일시> — hermes (Coder) — WO-002`) + wo/002에만 커밋

## 금지 사항
- 절대 금지 블록 준수: **실 S3 호출·버킷 생성·AWS 자격 파일 읽기·aws CLI 실행 일체 금지**
  (provision-s3.sh는 작성만, 실행 금지)
- `box-game/`·`run-game/` 파일 수정 금지 (읽기 전용 참조)
- 포트 3111 사용 금지, 백그라운드 서버는 턴 종료 전 정리
- 스코프 밖 기능 금지: 갤러리/목록 페이지, 인증, 삭제 기능, DB — 요청 없음
