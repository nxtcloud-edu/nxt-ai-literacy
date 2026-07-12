# WO-008: 콘텐츠 분류 탭(랜딩페이지/미니게임) + 코호트 모아보기
상태: 검증 대기
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/008` 브랜치 (README 규칙)

## 목표
갤러리 분류 축을 코호트에서 **콘텐츠 종류**로 바꾼다: 탭은 `전체 / 랜딩페이지 / 미니게임`.
코호트는 탭 대신 **모아보기 카드**로 — 클릭하면 그 수업 콘텐츠만 모아 보는 코호트 페이지로 이동.
근거: `docs/planning/DECISIONS.md` 2026-07-12 분류·코호트 페이지 결정.

## 설계 결정 (변경 금지)
1. **분류 상수** (server.js SSOT): `CATEGORIES = ['미니게임', '랜딩페이지']`.
   업로드 multipart에 `category` 필드 추가 — 목록에 없으면 400 "분류를 선택하세요."
   S3 Metadata에 `category`(encodeURIComponent) 저장, `/api/games` 응답에 `category` 포함.
   **기존 객체(category 메타데이터 없음)는 `미니게임`으로 간주** — 삭제·마이그레이션 금지.
2. **`/api/games` 필터**: 쿼리 파라미터 `?cohort=` `?category=` 지원 (서버 필터링).
   기존 무파라미터 동작(전체)은 유지.
3. **index.html**:
   - 필터 탭을 `전체 / 랜딩페이지 / 미니게임` 으로 교체 (코호트 탭 제거)
   - 탭 아래(또는 히어로 아래) **"수업별 모아보기" 코호트 카드 섹션**: `/api/cohorts` 기반,
     코호트명 + 해당 콘텐츠 개수 표시, 클릭 → `cohort.html?c=<코호트명>`
4. **`public/cohort.html` 신설**: 쿼리 `c`의 코호트명 표시 + 그 코호트 콘텐츠 전체(분류 탭 필터
   동일 적용) + "← 갤러리로 돌아가기". 존재하지 않는 코호트면 빈 상태 문구.
5. **upload.html**: 분류 `<select>` 추가 (미니게임/랜딩페이지) — 코호트 select와 같은 스타일.
6. **카드 클릭 동작은 이번 WO에서 바꾸지 않는다** (내부 뷰어는 WO-009) — 기존 새 탭 이동 유지.
7. 다크 톤·monospace·프레임워크 금지 유지. Terraform 변경 없음 (Metadata 추가는 권한 무관).
8. **커밋 분리** (최소 3): ① `feat:` API(분류·필터)+테스트 ② `feat:` UI(탭·코호트 카드·cohort.html·업로드 폼)
   ③ `docs:` README 4장 분류 선택 문구.

## 컨텍스트 (필독 파일)
- `html-delivery/server.js`, `public/*.html`, `test/validation.test.js` — 현행 구조
- `README.md` 4장

## 작업 단계
1. server.js: CATEGORIES·category 검증·Metadata·/api/games 필터 + 순수 함수 테스트
2. UI 3파일 (index/cohort/upload)
3. DRY_RUN 실측: 분류별 업로드→탭 필터→코호트 카드→코호트 페이지 동선 (curl+브라우저, Commands 전수)
4. npm test 그린
5. README 4장 갱신
6. TURN_LOG 완료 헤더 + 상태 `검증 대기` + wo/008 커밋

## 완료 기준
- [ ] 분류 없는 업로드 400, 미니게임/랜딩페이지 업로드 → 탭 필터 정확
- [ ] 기존(category 없는) 객체가 `미니게임`으로 표시되고 목록에서 빠지지 않음
- [ ] 코호트 카드 → cohort.html에서 해당 수업 콘텐츠만 표시
- [ ] npm test 전체 그린, 커밋 분리 준수
- [ ] TURN_LOG 완료 헤더 + wo/008에만 커밋

## 금지 사항
- 절대 금지 블록 준수. 검증은 단독 명령만 (긴 && 체인·node -e 금지)
- 카드 클릭 동작 변경 금지 (WO-009 몫), 게임 파일·lambda.js·infra 수정 금지
- 기존 S3 객체 삭제·수정 시도 금지 (검증자 몫도 아님 — fallback으로만 처리)
