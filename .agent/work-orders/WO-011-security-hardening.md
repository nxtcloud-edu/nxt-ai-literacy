# WO-011: 보안 하드닝 (rate limit·추천 유실·콘텐츠 오리진 격리)
상태: 대기
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/011` 브랜치 (README 규칙)

## 목표
WO-010 보안 리뷰(security-reviewer)에서 나온 M-1·M-2·L-1·L-2 처리.
근거: `.agent/TURN_LOG.md` 2026-07-12 20:10 엔트리 (이슈 처분 기록).

## 설계 결정 (변경 금지)
1. **Rate limiter (M-1·M-2)** — 외부 의존성 금지, in-memory Map 슬라이딩 윈도우 순수 모듈
   (`ratelimit.js`)로 작성. 클라이언트 식별: `x-forwarded-for` 첫 값(없으면 req.ip).
   - `POST /api/like`: 같은 IP×contentId 분당 3회, 같은 IP 전체 분당 30회
   - `POST /api/feedback`: 같은 IP 분당 5회
   - 초과 시 429 `"잠시 후 다시 시도해 주세요."`. 오래된 엔트리는 접근 시 정리(무한 성장 방지).
   - 한계(Lambda 인스턴스별·콜드스타트 리셋)를 모듈 주석에 명시 — 완화책이지 완전 방어 아님.
2. **추천 유실 방지 (L-1)** — 버전 업데이트 시 레지스트리 전체 Put 금지:
   DynamoDB `UpdateCommand`로 `latestVersion`·`latestKey`·`updatedAt`만 갱신 (likes 미접촉).
   DRY_RUN 로컬 레지스트리도 같은 의미(해당 필드만 병합)로.
3. **콘텐츠 오리진 격리 (L-2)** — `/play` 프록시 방식 폐기, S3 REST https 엔드포인트로 전환:
   - S3 모드 콘텐츠 URL = `https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{key}` —
     별도 오리진이라 앱(localStorage·API)과 브라우저 차원 격리, https라 mixed content 없음.
   - `view.html` iframe src·"새 탭에서 크게 보기"·`directUrl` 모두 이 URL로 통일.
   - **`/play/*` 라우트 삭제** (공격면 축소). DRY_RUN은 기존 `/deployed/{key}` 로컬 서빙 유지
     (개발 환경 한정 same-origin 수용 — 주석 명시).
   - infra: Lambda 환경변수 `BASE_URL`을 REST https URL로 교체(웹사이트 엔드포인트 의존 제거).
     `aws_s3_bucket_website_configuration`·관련 output은 제거(더는 안 씀).
4. **API 응답 계약**: `/api/games`·`/api/upload` 응답에 콘텐츠 접근 URL 필드(`directUrl` 또는
   `contentUrl`)가 REST https URL을 담도록 일관화 — view.html은 레지스트리 latestKey로 조립.
5. **커밋 분리** (최소 3): ① feat: ratelimit 모듈+적용+테스트 ② fix: 추천 유실 방지
   ③ feat: 오리진 격리(라우트 삭제·URL 전환·infra) (+ docs 필요 시 분리).

## 컨텍스트 (필독 파일)
- `html-delivery/server.js`, `registry.js`, `public/view.html`, `infra/main.tf`
- `.agent/TURN_LOG.md` 최근 2개 엔트리 — 보안 리뷰 결과·처분

## 작업 단계
1. ratelimit.js + node --test (윈도우 경계·정리·다중 키 케이스)
2. 레지스트리 부분 갱신(L-1) + 테스트 (버전업 후 likes 보존)
3. URL 전환·/play 삭제·infra 갱신, terraform fmt·validate
4. DRY_RUN 실측: like 4연타 → 4번째 429, feedback 6연타 → 6번째 429, 버전업 후 likes 보존,
   /play 404 확인 (Commands 전수)
5. npm test 그린, TURN_LOG 완료 헤더 + wo/011 커밋

## 완료 기준
- [ ] rate limit 실측 통과(429), 버전업 후 likes 보존, /play 라우트 부재
- [ ] S3 모드 콘텐츠 URL이 REST https 형식 (프로덕션 렌더 최종 확인은 검증자)
- [ ] npm test 전체 그린, terraform validate·fmt 통과, 커밋 분리 준수
- [ ] TURN_LOG 완료 헤더 + wo/011에만 커밋

## 금지 사항
- 절대 금지 블록 준수 (실 AWS 호출 금지). 검증은 단독 명령만 (긴 && 체인·node -e 금지)
- 외부 rate limit 라이브러리 금지 (내장 구현), 게임 파일·lambda.js 수정 금지
- 스코프 밖: 1인1표 영구 기록, CAPTCHA, helmet/CSP(백로그 유지), 로그인 — 요청 없음
