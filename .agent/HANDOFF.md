# Handoff

## Current handoff summary
WO-005는 검증·머지·배포 및 Lambda 프로덕션 E2E까지 완료됐다. WO-006에서 비개발자 수강생이 게임 선택부터 AI 협업 개선, 업로드·피드백·재개선까지 따라갈 수 있는 루트 `README.md`를 작성했다.

## First things to do before any next edit
```bash
git status --short --branch
git log -2 --pretty=format:'%h %s'
```

## Next recommended project actions
1. (Hermes) WO-006 완료 신호 확정 — README + 상태·TURN_LOG 커밋
2. (Claude) 상대 링크 4개와 6개 섹션 순서, 업로드 URL 비하드코딩, 내부 운영 내용 부재 재검증
3. 통과 시 main 머지

## Verification evidence
- `git diff --check` 통과
- README 상대 링크 4개 모두 실제 파일과 일치
- 6개 섹션 순서·CONFIG·강사 공지·최고 점수·1MB·새 URL 문구 확인
- `.agent/`, work-orders, Terraform 적용 절차, 하드코딩 HTTPS URL 부재 확인
- 제품 파일은 신규 루트 `README.md`만 변경; 게임과 기존 문서 미수정

## Collision risks
- 루트 README의 업로드 페이지는 의도적으로 `(강사 공지)`로 표기하며 실제 URL을 커밋하지 않음
- 게임의 알려진 단순함과 오류 가능성은 수강생 실습 재료이므로 게임 코드를 함께 수정하지 않음
