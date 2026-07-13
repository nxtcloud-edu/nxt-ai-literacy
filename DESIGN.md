# Design System: AI Content Gallery (showcase.nxtcloud.kr)

> `/design analyze` 산출물 (2026-07-13). 원본: `html-delivery/public/assets/theme.css` + 4개 페이지 인라인 스타일.
> 시각 문법의 상위 기준은 portal.nxtcloud.kr (WO-015에서 이식) — 이 문서가 이 레포의 SSOT.

## 1. Visual Theme & Atmosphere

흰 바탕 위 파랑기 도는 모눈종이가 깔린, 밝고 정돈된 교육 플랫폼 인터페이스.
포털(portal.nxtcloud.kr)과 같은 계열로 읽히는 브랜드 문법 — 중앙은 모눈이 드러나고
가장자리로 페이드되며, 파란 사각형이 절제된 투명도로 깜빡인다. 콘텐츠 카드는 흰 패널에
얇은 보더와 은은한 그림자로 떠 있고, 본문은 산세리프·라벨은 모노스페이스로 층위를 나눈다.

**Key Characteristics:**
- 40px 모눈 배경 + 중앙 라디얼 페이드 + 트윙클 (reduced-motion 대응)
- 라이트 기본 / 다크 토글 (localStorage 유지, FOUC 방지)
- 산세리프 본문 × 모노스페이스 라벨의 이중 타이포 체계
- slate-900 계열 프라이머리 버튼, 브랜드 액센트는 시안·핑크 포인트만
- 카드 중심 갤러리 — hover에서 보더 강조 + 그림자 상승
- 의존성 0 (프레임워크·외부 폰트·아이콘 라이브러리 없음)

## 2. Color Palette & Roles

라이트가 기본. 다크 값은 `[data-theme="dark"]` 오버라이드 (괄호 병기).

### Background Surfaces
- **Cloud White** (`#f8fafc`, 다크 `#090a12`) — 페이지 배경 `--bg`
- **Panel White** (`#ffffff`, 다크 `#15182b`) — 카드·패널 `--panel`
- **Soft Panel** (`#f0f2f8`, 다크 `#101222`) — 비활성 필터 등 `--panel-soft`
- **Nav Veil** (`#f8fafce8`, 다크 `#090a12e8`) — 스티키 네비 (blur 14px) `--nav`

### Text & Content
- **Ink Navy** (`#1c1f2e`, 다크 `#f4f6ff`) — 본문 `--text` (순수 검정 금지 준수)
- **Muted Slate** (`#5b6178`, 다크 `#aeb5cc`) — 보조 텍스트 `--muted`

### Brand & Accent
- **Signal Cyan** (`#007fae`, 다크 `#00d2ff`) — 링크·활성 탭·카드 hover `--cyan` (주 액센트)
- **Brand Pink** (`#d73552`, 다크 `#e94560`) — 추천 하트 등 포인트 한정 `--pink`
- **Primary Slate** (`#0f172a`, hover `#1e293b`) — 프라이머리 버튼 배경 (테마 공통)

### Status Colors
- **Danger Rose** (`#b4233c`, 다크 `#ff9aae`) — 에러 메시지 `--danger`

### Border & Divider
- **Line Mist** (`#d9dce8`, 다크 `#343954`) — 기본 보더 `--line`
- **Card Edge** (`#c9cede`, 라이트 전용) — 카드·필터 보더 (대비 강화)
- **Grid Line** (`rgba(59,130,246,.055)`, 다크 `rgba(255,255,255,.035)`) — 모눈 `--grid-line`
- **Twinkle Blue** (`rgba(59,130,246,.8)` @ opacity .08) — 배경 트윙클 `--twinkle`

## 3. Typography Rules

### Font Family
- **Primary**: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard", sans-serif`
- **Monospace**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  — 적용 대상: 브랜드 라벨, eyebrow, 카드 라벨(OPEN CONTENT · vN), 분류 칩, 시각, 메타, 카운트
- 외부 폰트 로드 금지 (시스템 스택만)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display (히어로) | Primary | `clamp(38px, 7vw, 72px)` | 800 | 1.1 | -0.06em | index 히어로 |
| Heading 1 (뷰어 제목) | Primary | `clamp(30px, 6vw, 54~56px)` | 800 | 1.15 | -0.06em | view/cohort |
| Heading 2 (섹션) | Primary | 24px | 700 | 1.3 | -0.02em | "콘텐츠 둘러보기" |
| Card Title | Primary | 21px | 700 | 1.35 | — | 카드 제목 (title 우선) |
| Body | Primary | 16~17px, 히어로 리드 `clamp(16px,2vw,19px)` | 400 | 1.6 | — | |
| Caption/Meta | Mono | 12~13px | 400 | 1.5 | .06em(라벨) | 시각·칩·라벨 |
| Code/Label | Mono | 11~13px | 400~700 | — | — | eyebrow 등 |

### Principles
- 한국어 줄바꿈은 `word-break: keep-all` (중간 단어 분리 금지 — WO-021)
- 제목은 tight tracking(-0.06em) + 고 weight, 본문은 1.6 leading
- 라벨성 정보(버전·시각·분류)는 반드시 모노 — 본문과 층위 구분
- 크기는 `clamp()`로 유동 스케일, body 최소 16px

## 4. Component Stylings

### Buttons
**Primary** (`.upload-link`, 업로드 제출) — bg `#0f172a`, text `#fff`, radius 10px,
padding 8~12px×12~24px, min-height 40px, shadow `0 1px 2px rgba(15,23,42,.12)`,
hover bg `#1e293b`, active `translateY(1px)` (WO-021)
**Secondary/Toggle** (테마 토글) — bg `--panel`, border 1px `--line`, radius 10px,
min-height 40px, hover border `--cyan`
**Filter/Tab** (`.filter`) — bg `#fff`(라이트)/`--panel-soft`, border `#c9cede`, radius 10px,
min-height 44px, 활성: border `--cyan` + bg `#e4f5fb` + `inset 0 -2px 0 var(--cyan)`

### Cards & Containers
- bg `--panel`, radius 16px, border 1px (`#c9cede` 라이트 / `--line` 다크)
- 라이트 shadow `0 1px 3px rgba(28,31,46,.08), 0 4px 14px rgba(28,31,46,.06)`
- hover: border `--cyan` + shadow 상승, 우하단 `↗` 시안 마커
- 내부 리듬: 패딩 `--sp-6`, 라벨↓`--sp-2`, 제목↓`--sp-1`, 메타↓`--sp-3`, 칩줄↓`--sp-3`, 날짜

### Inputs & Forms
- border 1px `--line`, radius 10px, bg `--input`, label은 필드 위 블록 배치
- 파일 규칙 힌트는 mono 캡션으로 필드 아래

### Badges & Pills
- 분류 칩: mono 12px, border 1px, muted 색, 좋아요(`♥ N`)와 `--sp-3` 간격

### Navigation
- 스티키 상단, min-height 64px, blur veil, 하단 1px 보더
- 좌: 로고(36px, radius 10px, 흰 칩) + mono 브랜드 라벨 / 우: 테마 토글 (+홈: 업로드 버튼)
- 복귀 링크는 네비가 아닌 본문(요약/인트로 아래) — WO-016·019 결정
- 모바일(≤560px): 브랜드 라벨 숨김

## 5. Layout Principles

### Spacing System
- Base 4px. Scale: `--sp-1:4 / --sp-2:8 / --sp-3:12 / --sp-4:16 / --sp-6:24 / --sp-8:32` (WO-021)
- 임의 px 간격 신규 도입 금지 — 스케일 변수만 사용

### Grid & Container
- 컨테이너: index `min(1120px, 90vw)` / cohort `min(1050px, 90vw)` / view `min(1180px, 94vw)`
- 갤러리: `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`, gap 18px(→`--sp-4`~) 

### Whitespace Philosophy
- 히어로는 에어리하게(모눈이 숨 쉬도록), 카드 내부는 정보 밀도 대비 넉넉한 패딩
- 기능 그룹 사이(정렬 탭↔분류 탭)는 그룹 내 간격보다 크게

### Border Radius Scale
- Micro 없음 → Standard 10px(버튼·입력·칩·로고) → Card 16px → Pill/Circle 미사용

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 배경 모눈 위 텍스트 | 히어로, 섹션 제목 |
| Subtle | border + 2단 soft shadow | 카드, 코호트 카드 |
| Elevated | hover 시 shadow 상승 + cyan border | 카드 hover |
| Dialog | 미사용 (페이지 이동으로 대체) | — |

**Shadow Philosophy**: 그림자는 라이트 모드에서 카드-배경 분리용으로만. 네온 글로우·강한 drop shadow 금지. 다크 모드는 보더가 분리를 담당.

## 7. Do's and Don'ts

### Do
- 모든 신규 간격은 `--sp-*` 스케일에서 선택
- 한국어 텍스트 블록에 `word-break: keep-all`
- 라벨성 정보는 모노, 본문은 산세리프 — 층위 유지
- 버튼·인터랙티브 요소 min-height 40px(네비)~44px(본문 탭)
- 다크 모드 동시 검증 (토글 후 스크린샷)
- 업로드된 수강생 콘텐츠(iframe)는 스타일 불간섭

### Don't
- 순수 검정(#000000), 외부 폰트/아이콘/CSS 라이브러리
- 액센트 남용 — 시안은 인터랙션, 핑크는 포인트 한정
- 중앙 히어로 외 요소에 라디얼 페이드 재사용 (문법 희석)
- 카드 안 요소 겹침, z-index 남용 (네비 20만 예외)
- `h-screen`류 고정 뷰포트 (iOS 주소창 점프)
- 렌더 확인 없이 "시각 검증 완료" 주장 (정적 리뷰로 명시)

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | ≤560px | 네비 패딩 축소, 브랜드 라벨 숨김, 토글 축소 |
| Tablet+ | >560px | 기본 레이아웃 |
| 카드 그리드 | auto-fill minmax(260px,1fr) | 브레이크포인트 없이 유동 |

### Touch Targets
- 본문 인터랙티브(탭·필터) 44px, 네비 버튼 40px, 복귀 링크 44px(패딩 확보)

### Collapsing Strategy
- 필터 행은 `overflow-x:auto` 가로 스크롤 허용 (모바일)
- 뷰어 iframe: `height:min(72vh,760px)`, 모바일 58vh

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: Primary Slate (`#0f172a`)
- Background: Cloud White (`#f8fafc`) + Grid Line (`rgba(59,130,246,.055)`)
- Accent: Signal Cyan (`#007fae` 라이트 / `#00d2ff` 다크)
- Point: Brand Pink (`#d73552`) — 추천 하트 한정
- Text: Ink Navy (`#1c1f2e`) / Muted Slate (`#5b6178`)

### Example Component Prompts
- "카드 컴포넌트를 만들어줘: bg var(--panel), radius 16px, 라이트에서 border #c9cede + soft shadow 2단, hover 시 border var(--cyan)와 shadow 상승, 내부 간격은 --sp 스케일(패딩 --sp-6, 라벨↓--sp-2, 제목↓--sp-1, 메타↓--sp-3)"
- "프라이머리 버튼: bg #0f172a, radius 10px, min-height 40px, hover #1e293b, active translateY(1px), 텍스트 #fff 700"
- "필터 탭 행: mono 라벨, min-height 44px, 활성 상태는 cyan border + #e4f5fb 배경 + inset 하단 2px cyan"
- "새 페이지 뼈대: theme.js를 head 최상단, theme.css 링크, body에 grid-twinkles 스팬 7개, sticky .site-nav(로고+토글), main은 min(1120px,90vw)"

### Iteration Guide
1. `assets/theme.css`의 변수·스케일 먼저 확인 — 새 값 발명 금지
2. 라이트 기본으로 작업 → 다크 토글로 재확인 (두 테마 모두 스크린샷)
3. 간격은 `--sp-*`만, 한국어 블록은 keep-all
4. 완료 전 /design review 체크리스트(터치 타깃·대비·reduced-motion) 자체 점검
