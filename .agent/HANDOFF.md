# Handoff

## Current handoff summary
WO-026(공개 페이지 푸터 + 관리자 링크) 완료·개통. main HEAD=`1a43cb2`.

WO-027 발행: 관리자가 로그인 상태에서 자신의 로그인 비밀번호를 관리자 페이지에서 변경.
구조 = DynamoDB 오버라이드 아이템(`contentKey='admin#credential'`, `createdAt='meta'`)에 hash/salt 저장,
로그인·검증 시 오버라이드 우선·env 폴백. 인프라/IAM/env 변경 없음(같은 테이블·기존 권한 재사용).
env는 복구용(오버라이드 삭제 시 복귀). Coder(Hermes)는 `wo/027`에서 작업.

## Next recommended project actions (Coder = Hermes)
1. registry: getAdminCredential·saveAdminCredential(DRY_RUN 전용 파일 `.local-admin-credential.json`, 0o600, gitignore)
2. admin-auth: createAdminAuth(deps 주입)·resolveActiveCredential·login async·changePassword
3. server.js 라우트·주입, admin.html 비번 변경 패널(현재/새/확인, textContent)
4. DRY_RUN 실측 5개 한정 + 테스트, 커밋 분리, TURN_LOG 완료 헤더 + wo/027
5. 검증(Claude): 통과 시 main 머지 + Lambda 재배포(코드 해시만)

## Collision risks
- 실 AWS 호출·terraform plan/apply·aws CLI·push·main 머지·배포는 Coder 금지(검증자 전담)
- 새 env·새 IAM·새 테이블 금지, 관리자 아이디 변경 금지(비번만)
- 평문/해시/솔트 로그·하드코딩 금지, innerHTML 금지, 공개 페이지·헤더·푸터 수정 금지
- 로컬 레지스트리에 자격 아이템 넣지 말 것(갤러리 유출) — 전용 파일

## 잔여 권고 (WO 아님)
- (사용자 결정: 현행 유지) 관리자 비번이 팀 공통 비번과 동일. WO-027 개통 후에는 관리자 페이지에서 직접 변경 가능.
