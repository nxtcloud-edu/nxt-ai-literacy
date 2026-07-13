# WO-024: 관리자 인증(아이디+비밀번호) 및 관리 API
상태: 검증 대기
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/024` 브랜치

## 목표
관리자 로그인(세션 쿠키)과 관리 API 4종. UI·infra는 WO-025.
근거: 사용자 확정 — env 방식, HttpOnly 쿠키 세션.

## 설계 결정 (변경 금지)
1. **자격 env**: `ADMIN_ID`, `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD_SALT`, `SESSION_SECRET`.
   넷 중 하나라도 없으면 `/api/admin/*` 전부 503 `"관리자 기능이 설정되지 않았습니다."`
   (DRY_RUN 검증은 env 주입으로).
2. **로그인**: `POST /api/admin/login` `{id, password}` — 검증은 기존 `verifyPassword`(scrypt+
   timingSafeEqual) 재사용, id 비교도 timing-safe. **IP당 분당 5회 rate limit**(기존 모듈 재사용),
   실패 401 `"아이디 또는 비밀번호가 맞지 않아요."` (어느 쪽이 틀렸는지 구분 금지).
   성공: 세션 쿠키 발급.
3. **세션**: `base64url(payload).base64url(HMAC-SHA256(payload, SESSION_SECRET))`,
   payload = `{"exp": <epoch+12h>}`. 쿠키 `admin_session` — `HttpOnly; SameSite=Strict; Path=/;
   Max-Age=43200`, `Secure`는 `S3_BUCKET` 설정 시(=프로덕션)에만. 쿠키 파싱은 헤더 직접 파싱
   (라이브러리 금지). 만료·서명 불일치는 401.
4. **`requireAdmin` 미들웨어** → 적용 대상:
   - `GET /api/admin/session` → `{ ok: true }` (UI의 로그인 상태 확인용)
   - `POST /api/admin/logout` → 쿠키 즉시 만료
   - `POST /api/admin/reset-password` `{contentId, newPassword}` — 4~30자, 새 salt+hash 교체
   - `PATCH /api/admin/content/:contentId` `{title?, name?, affiliation?, category?}` —
     기존 업로드 검증 규칙 그대로(코호트·팀·분류·길이), 부분 갱신
   - `DELETE /api/admin/content/:contentId` — 레지스트리 meta + S3 객체 **전 버전**
     (`games/{contentId}-v1..latestVersion`) + 해당 피드백 아이템 전부 삭제
   - `DELETE /api/admin/feedback` `{contentId, createdAt}` — 피드백 1건 삭제
5. **DRY_RUN 페어**: 로컬 레지스트리·로컬 피드백·`.local-deploy` 파일 삭제로 동일 계약.
6. **감사 로그**: 관리자 변이 작업마다 `console.log(JSON.stringify({admin_action, contentId, at}))`
   — 비밀번호·해시 값 로그 금지.
7. **커밋 분리** (최소 2): ① feat: 인증(로그인·세션·미들웨어)+테스트 ② feat: 관리 API 4종+테스트.

## 작업 단계
1. 세션 서명/검증 순수 함수 + node --test (서명·변조·만료 경계)
2. 로그인·rate limit·미들웨어 + 테스트 (성공/401/429/503)
3. 관리 API + 레지스트리 확장(삭제·비번 교체·부분 갱신 — DRY_RUN 페어) + 테스트
4. DRY_RUN 실측 (핵심 시나리오 5개 한정): 로그인→session ok / 틀린 비번 401 / 미인증 관리 API 401
   / reset-password 후 새 비번으로 콘텐츠 버전업 성공 / 콘텐츠 삭제 후 갤러리·피드백에서 소멸
5. npm test 그린, TURN_LOG 완료 헤더 + wo/024 커밋

## 완료 기준
- [ ] 위 실측 5개 통과, 평문 비밀번호가 코드·로그·저널 어디에도 없음
- [ ] npm test 전체 그린, 커밋 분리, TURN_LOG 완료 헤더 + wo/024에만 커밋

## 금지 사항
- 절대 금지 블록 준수 (실 AWS 호출 금지 — S3/DynamoDB 삭제 코드는 작성만). 검증은 단독 명령만
- UI(admin.html)·infra 수정 금지 (WO-025), 외부 라이브러리 금지 (내장 crypto·수동 쿠키 파싱)
- 브라우저 실측은 위 5개 시나리오 한정
