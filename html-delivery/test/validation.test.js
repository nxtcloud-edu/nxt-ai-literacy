const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { hashPassword, newContentId, publicContent, verifyPassword } = require('../registry');
const { CATEGORIES, COHORTS, createVersionKey, filterGames, isValidContentId, isValidContentKey, parseFeedbackLog, sortGames, validateFeedbackInput, validateUploadInput } = require('../server');

const htmlFile = { originalname: 'content.html', size: 100 };
function runtimeSecret() { return crypto.randomBytes(12).toString('base64url'); }

test('업로드 입력은 소유 비밀번호 4~30자를 요구한다', () => {
  const password = runtimeSecret();
  assert.deepEqual(validateUploadInput({ affiliation: COHORTS[0], category: CATEGORIES[0], name: '작품', password, file: htmlFile }).errors, []);
  assert.equal(validateUploadInput({ affiliation: COHORTS[0], category: CATEGORIES[0], name: '작품', password: '', file: htmlFile }).errors[0], '비밀번호는 4~30자로 입력하세요.');
  assert.equal(validateUploadInput({ affiliation: COHORTS[0], category: CATEGORIES[0], name: '작품', password: 'x'.repeat(31), file: htmlFile }).errors[0], '비밀번호는 4~30자로 입력하세요.');
});

test('기존 업로드 검증 규칙을 유지한다', () => {
  const password = runtimeSecret();
  assert.equal(validateUploadInput({ affiliation: '없음', category: CATEGORIES[0], name: '작품', password, file: htmlFile }).errors[0], '등록된 수업(코호트)을 선택하세요.');
  assert.equal(validateUploadInput({ affiliation: COHORTS[0], category: '', name: '작품', password, file: htmlFile }).errors[0], '분류를 선택하세요.');
  assert.equal(validateUploadInput({ affiliation: COHORTS[0], category: CATEGORIES[0], name: '', password, file: htmlFile }).errors[0], '이름은 1~40자로 입력하세요.');
  assert.equal(validateUploadInput({ affiliation: COHORTS[0], category: CATEGORIES[0], name: '작품', password, file: { originalname: 'x.txt', size: 1 } }).errors[0], 'HTML 파일만 업로드할 수 있습니다.');
});

test('scrypt 해시는 랜덤 salt를 사용하고 timing-safe 검증한다', () => {
  const password = runtimeSecret();
  const first = hashPassword(password);
  const second = hashPassword(password);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.passwordHash, second.passwordHash);
  assert.equal(verifyPassword(password, first.passwordHash, first.salt), true);
  assert.equal(verifyPassword(runtimeSecret(), first.passwordHash, first.salt), false);
});

test('공개 콘텐츠에서 해시와 salt 및 Dynamo 키를 제거한다', () => {
  const content = publicContent({ contentKey: 'content#12345678', createdAt: 'meta', contentId: '12345678', passwordHash: 'hash', salt: 'salt', name: '작품' });
  assert.deepEqual(content, { contentId: '12345678', name: '작품' });
});

test('contentId와 버전 key 계약을 지킨다', () => {
  const id = newContentId();
  assert.equal(isValidContentId(id), true);
  assert.equal(createVersionKey(id, 1), `games/${id}-v1.html`);
  assert.equal(isValidContentKey(`games/${id}-v12.html`), true);
  assert.equal(isValidContentKey(`games/${id}.html`), false);
  assert.equal(isValidContentKey('games/20260712000000-abcd.html'), false);
});

test('갤러리는 필터와 최신순 정렬을 적용한다', () => {
  const games = [
    { contentId: '11111111', affiliation: COHORTS[0], category: CATEGORIES[0], updatedAt: '2026-01-01T00:00:00Z', likes: 1 },
    { contentId: '22222222', affiliation: COHORTS[1], category: CATEGORIES[1], updatedAt: '2026-01-02T00:00:00Z', likes: 3 },
  ];
  assert.deepEqual(filterGames(games, { cohort: COHORTS[0] }).map((x) => x.contentId), ['11111111']);
  assert.deepEqual(sortGames(games).map((x) => x.contentId), ['22222222', '11111111']);
});

test('피드백 검증과 contentId별 오름차순 파싱을 유지한다', () => {
  assert.equal(validateFeedbackInput({ message: ' ' }).errors[0], '피드백은 1~500자로 입력하세요.');
  const id = '12345678';
  const lines = [
    JSON.stringify({ contentKey: id, createdAt: '2026-01-02T00:00:00Z', message: '둘' }),
    JSON.stringify({ contentKey: id, createdAt: '2026-01-01T00:00:00Z', message: '하나' }),
  ].join('\n');
  assert.deepEqual(parseFeedbackLog(lines, id).map((x) => x.message), ['하나', '둘']);
});
