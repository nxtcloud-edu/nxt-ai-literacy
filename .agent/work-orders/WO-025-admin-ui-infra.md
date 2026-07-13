# WO-025: 관리자 UI + infra 배선 (env·IAM)
상태: 대기
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/025` 브랜치

## 목표
WO-024 관리 API 위에 관리자 페이지(`/admin.html`)와 infra 배선(Lambda env·IAM)을 얹는다.

## 설계 결정 (변경 금지)
1. **infra** (main.tf·variables.tf):
   - sensitive 변수 4개: `admin_id`, `admin_password_hash`, `admin_password_salt`,
     `session_secret` (기본값 없음 — tfvars 필수). Lambda env `ADMIN_ID`·`ADMIN_PASSWORD_HASH`·
     `ADMIN_PASSWORD_SALT`·`SESSION_SECRET` 주입.
   - IAM 최소 확장: 기존 games/* 정책에 `s3:DeleteObject`, 기존 테이블 정책에
     `dynamodb:DeleteItem` 추가 (그 외 액션 추가 금지).
   - `terraform.tfvars.example`에 4개 키 자리 표시(더미 값) 추가.
2. **`public/admin.html`** (DESIGN.md 준수, noindex 메타, 갤러리에서 링크 노출 금지):
   - 미로그인: 아이디·비밀번호 폼 → `/api/admin/login` → 성공 시 관리 화면 전환
     (상태 확인은 `GET /api/admin/session`), 로그아웃 버튼
   - 관리 화면: 콘텐츠 테이블 — 코호트 필터 + 텍스트 검색(제목·이름), 열: 제목/이름/코호트/
     분류/버전/추천/업데이트. 행 동작 3개: **수정**(제목·이름·코호트·분류 인라인 편집 →
     PATCH), **비번 재설정**(새 비번 입력 → POST), **삭제**(브라우저 confirm 2회 아님 —
     1회 confirm에 콘텐츠 제목 표시 → DELETE)
   - 행 펼침으로 해당 콘텐츠 피드백 목록 + 개별 삭제
   - 모든 렌더링 textContent (innerHTML 금지), 오류는 status 라인에 한국어로
3. **`scripts/hash-admin-password.js`**: stdin으로 비밀번호 입력받아(에코 끔) hash·salt 출력 —
   운영자 자격 회전용. 평문 미저장.
4. **커밋 분리** (최소 2): ① feat: infra 배선 ② feat: admin UI(+스크립트).

## 작업 단계
1. infra 변수·env·IAM, terraform fmt·validate
2. admin.html + hash 스크립트
3. DRY_RUN 실측 (5개 한정): 로그인 화면→로그인→테이블 로드 / 검색·필터 / 제목 수정 반영 /
   삭제 confirm→목록 소멸 / 로그아웃 후 401 화면 복귀. 서버 기동 시 관리자 env는 테스트 값 주입
   (게이트 차단 시 실측은 검증자 대행 — 시도 1회만 하고 막히면 바로 보고)
4. npm test 그린, TURN_LOG 완료 헤더 + wo/025 커밋

## 완료 기준
- [ ] terraform validate·fmt·npm test 그린, IAM은 지정 2개 액션만 추가
- [ ] admin.html 동선 5개 (실측 또는 검증자 대행 명시)
- [ ] TURN_LOG 완료 헤더 + wo/025에만 커밋 (커밋 분리)

## 금지 사항
- 절대 금지 블록 준수 (plan/apply·aws CLI 금지). 검증은 단독 명령만
- 외부 라이브러리 금지, 갤러리·업로드 등 기존 페이지 수정 금지
- tfvars 실제 값 커밋 금지 (example만)
