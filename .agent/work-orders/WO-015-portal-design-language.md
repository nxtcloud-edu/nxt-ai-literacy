# WO-015: 포털 디자인 문법 이식 (모눈 배경 + 라이트 모드 마감)
상태: 완료 (2026-07-13, 검증자 Claude — 라이트·다크 브라우저 실측 통과, main 머지)
작성: Claude (Planner) / 실행: Hermes (Coder)
워크트리 게이트: `wo/015` 브랜치 (README 규칙)

## 목표
https://portal.nxtcloud.kr/ (로컬: `/Users/glen/Desktop/work/nxt-portal`)의 시각 문법을 따라간다.
핵심은 **흰 바탕 + 모눈종이 배경**. 사용자 확정 (2026-07-13).

## 참조 원본 (실측 분석)
- 포털은 Magic UI `AnimatedGridPattern` 사용: 40×40px SVG 모눈, `stroke-blue-500/20`,
  히어로에 `mask-image: radial-gradient(500px circle at center, white, transparent)`,
  무작위 사각형 트윙클 `maxOpacity 0.08`, `fill-blue-500/20`
- 주변 문법: 흰 배경, slate-200 얇은 보더 + `rounded-2xl` 카드, `bg-slate-900` 프라이머리 버튼,
  산세리프 본문, 절제된 그림자

## 설계 결정 (변경 금지)
1. **모눈 배경 (라이트 모드)** — 의존성 없이 CSS로 재현:
   - body(또는 고정 배경 레이어)에 40px 간격 모눈:
     `repeating-linear-gradient` ×2 (가로/세로), 선 색 `rgba(59,130,246,.10)` 수준
   - 히어로 영역엔 중앙 라디얼 페이드: 모눈 레이어에
     `mask-image: radial-gradient(560px circle at 50% 30%, black, transparent)` 감각 —
     포털처럼 "중앙만 모눈이 드러나는" 연출. 갤러리 본문 구간은 페이드 없는 은은한 모눈 허용
   - **트윙클**: CSS keyframes로 파란 사각형 6~8개가 서로 다른 딜레이로 opacity 0→0.08→0
     반복 (JS 최소, prefers-reduced-motion 시 비활성)
2. **라이트 모드 마감 문법**:
   - 본문 폰트를 시스템 산세리프 스택으로 전환
     (`-apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard", sans-serif` 감각).
     단, 라벨성 요소(OPEN CONTENT·v1, 코호트명, 날짜)는 모노 유지 — 갤러리 정체성 절충
   - 카드 `border-radius` 16px 수준으로 상향, slate-200 톤 보더 유지(WO-013 그림자 유지)
   - 프라이머리 버튼("내 콘텐츠 업로드", 업로드 제출)을 slate-900(다크 네이비 블랙) 배경으로
     — 기존 핑크(#e94560)는 추천 하트·포인트 액센트로 강등
3. **다크 모드**: 모눈을 어두운 톤(선 `rgba(255,255,255,.06)` 수준)으로 대응 — 문법 일관 유지.
   기존 다크 팔레트·토글 동작은 회귀 없이.
4. **적용 범위**: 4개 페이지 전부 + `assets/theme.css`(공통 SSOT). 수강생 콘텐츠 iframe은 불변.
5. **커밋 분리** (최소 2): ① feat: 모눈 배경 시스템 ② feat: 라이트 마감(폰트·라운딩·버튼).

## 컨텍스트 (필독 파일)
- `/Users/glen/Desktop/work/nxt-portal/components/ui/animated-grid-pattern.tsx` — 원본 파라미터
- `/Users/glen/Desktop/work/nxt-portal/app/page.tsx` L127-137 — 사용부 (마스크·투명도)
- `html-delivery/public/assets/theme.css`, `public/*.html`

## 작업 단계
1. theme.css에 모눈 배경 레이어 + 트윙클 + 다크 대응
2. 라이트 마감 (폰트 스택·라운딩·버튼 톤)
3. DRY_RUN 브라우저: 4페이지 × 라이트/다크 확인 — 특히 라이트 히어로가 포털의
   "중앙 모눈 + 가장자리 페이드" 인상과 일치하는지
4. npm test 그린 (UI만 변경이므로 회귀 확인 성격)
5. TURN_LOG 완료 헤더 + 상태 `검증 대기` + wo/015 커밋

## 완료 기준
- [ ] 라이트 모드가 포털 문법(흰 바탕·모눈·중앙 페이드·절제된 파란 액센트)과 시각적으로 동조
- [ ] 다크 모드 회귀 없음 + 어두운 모눈 대응, 토글·유지 정상
- [ ] prefers-reduced-motion 대응, 외부 의존성 0 유지
- [ ] TURN_LOG 완료 헤더 + wo/015에만 커밋 (커밋 분리)

## 금지 사항
- 절대 금지 블록 준수. 검증은 단독 명령만
- React·motion·Tailwind 등 프레임워크 도입 금지 — 순수 CSS(+최소 JS)로 재현
- 서버 코드·infra 수정 금지, 수강생 게임 파일 불변
- nxt-portal 저장소 수정 금지 (읽기 전용 참조)
