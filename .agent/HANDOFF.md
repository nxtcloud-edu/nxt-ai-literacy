# Handoff

## Current handoff summary
WO-027 구현은 `wo/027`에서 완료되어 검증 대기 상태다. 관리자가 로그인 상태에서 자신의 관리자 로그인 비밀번호를 바꿀 수 있도록 구현했다.

구현 구조:
- DynamoDB/DRY_RUN override key: `contentKey='admin#credential'`, `createdAt='meta'`
- 저장 값: `passwordHash`, `salt`, `updatedAt`
- 로그인·현재 비밀번호 검증은 override 우선, 없으면 env 폴백
- `ADMIN_ID`와 `SESSION_SECRET`은 계속 env만 사용
- 인프라/IAM/env 변경 없음. 기존 `FEEDBACK_TABLE` Get/Put 권한만 재사용
- DRY_RUN은 `html-delivery/.local-admin-credential.json` 전용 파일 사용, 로컬 registry 미오염

구현 커밋:
- `6ec4835 feat: 관리자 비밀번호 오버라이드 저장과 검증 추가`
- `ed6dae6 feat: 관리자 비밀번호 변경 패널 추가`
- Journal/status docs commit: current HEAD `docs: WO-027 검증 대기 기록`

## Verification already run by Hermes
- Targeted tests: `node --test test/admin-auth.test.js test/admin-api.test.js test/admin-ui.test.js` → 15/15 pass.
- Full suite: `npm test` (`html-delivery`) → 38/38 pass.
- DRY_RUN script probe with generated runtime credentials, `FEEDBACK_TABLE` unset:
  1. env fallback login → 200
  2. password change → 200
  3. new password login → 200 and old password login → 401
  4. wrong current password → 401
  5. invalid new password → 400
- DRY_RUN storage checks: credential file mode `600`, local registry absent, gallery count `0`, audit action only `change-password`.
- Cleanup: the app server was closed by the script; Hermes `process list` is empty; `search_files html-delivery .local-*` found no files.
- Blocked cleanup note: `rm -f /tmp/wo027-dryrun.js && test ! -e .local-admin-credential.json && test ! -e .local-registry.json && git status --short --branch` was blocked by the dangerous-command gate because of `rm`; per protocol it was not retried. The temp script contains no hardcoded plaintext/hash/salt values; it only generated credentials at runtime.

## Next recommended project actions (Verifier = Claude)
1. Re-check diff scope: `.gitignore`, `registry.js`, `admin-auth.js`, `server.js`, `admin.html`, tests only.
2. Re-run `npm test` and scoped DRY_RUN checks, including admin.html panel submit behavior.
3. If accepted, Claude only: main merge + Lambda redeploy. Hermes must not push/merge/apply.

## Collision risks
- 실 AWS 호출·terraform plan/apply·aws CLI·push·main 머지·배포는 Coder 수행 금지(검증자 전담)
- 새 env·새 IAM·새 테이블 없음; 관리자 아이디 변경 기능 없음
- 평문/해시/솔트는 로그·저널·코드에 하드코딩하지 않음
- 공개 페이지·헤더·푸터는 수정하지 않음

## 잔여 권고 (WO 아님)
- WO-027이 승인·배포되면 관리자 페이지에서 현행 팀 공통 비밀번호를 직접 변경 가능.
