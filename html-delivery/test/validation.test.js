const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CATEGORIES,
  COHORTS,
  DEFAULT_CATEGORY,
  MAX_FILE_SIZE,
  UNKNOWN_METADATA,
  createObjectKey,
  decodeMetadataValue,
  encodeMetadataValue,
  filterGames,
  isValidContentKey,
  normalizeCategory,
  parseFeedbackLog,
  parseUploadLog,
  publicUrl,
  sortGames,
  validateFeedbackInput,
  validateUploadInput,
} = require('../server');

function file(name = 'game.html', size = 10) {
  return { originalname: name, size };
}

test('정상 입력은 trim 후 통과한다', () => {
  const result = validateUploadInput({ affiliation: `  ${COHORTS[0]} `, category: ` ${CATEGORIES[0]} `, name: ' 홍길동 ', file: file() });
  assert.deepEqual(result.errors, []);
  assert.equal(result.affiliation, COHORTS[0]);
  assert.equal(result.category, CATEGORIES[0]);
  assert.equal(result.name, '홍길동');
});

test('등록되지 않은 코호트는 거부한다', () => {
  const result = validateUploadInput({ affiliation: '2026-다른수업', category: CATEGORIES[0], name: '홍길동', file: file() });
  assert.equal(result.errors[0], '등록된 수업(코호트)을 선택하세요.');
});

test('분류 누락 또는 미등록 분류는 거부한다', () => {
  const missing = validateUploadInput({ affiliation: COHORTS[0], name: '홍길동', file: file() });
  const invalid = validateUploadInput({ affiliation: COHORTS[0], category: '웹앱', name: '홍길동', file: file() });
  assert.equal(missing.errors[0], '분류를 선택하세요.');
  assert.equal(invalid.errors[0], '분류를 선택하세요.');
});

test('비HTML 파일은 거부한다', () => {
  const result = validateUploadInput({ affiliation: COHORTS[0], category: CATEGORIES[0], name: '홍길동', file: file('game.txt') });
  assert.match(result.errors[0], /HTML/);
});

test('1MB 초과 파일은 거부한다', () => {
  const result = validateUploadInput({ affiliation: COHORTS[1], category: CATEGORIES[1], name: '홍길동', file: file('game.html', MAX_FILE_SIZE + 1) });
  assert.match(result.errors[0], /1MB/);
});

test('필드 누락과 공백은 거부한다', () => {
  const result = validateUploadInput({ affiliation: ' ', name: '', file: null });
  assert.equal(result.errors.length, 4);
});

test('키는 ASCII games 경로와 html 확장자를 사용한다', () => {
  const key = createObjectKey(new Date('2026-07-12T05:06:07.000Z'));
  assert.match(key, /^games\/20260712050607-[0-9a-f]{4}\.html$/);
});

test('S3 메타데이터 값은 ASCII URI 인코딩으로 저장한다', () => {
  const encoded = encodeMetadataValue('서울 1팀/홍길동');
  assert.equal(encoded, '%EC%84%9C%EC%9A%B8%201%ED%8C%80%2F%ED%99%8D%EA%B8%B8%EB%8F%99');
  assert.equal(decodeMetadataValue(encoded), '서울 1팀/홍길동');
});

test('메타데이터 누락 또는 디코딩 실패는 알 수 없음으로 표시한다', () => {
  assert.equal(decodeMetadataValue(undefined), UNKNOWN_METADATA);
  assert.equal(decodeMetadataValue('%E0%A4%A'), UNKNOWN_METADATA);
});

test('기존 분류 없는 항목과 잘못된 분류는 미니게임으로 간주한다', () => {
  assert.equal(normalizeCategory(undefined), DEFAULT_CATEGORY);
  assert.equal(normalizeCategory('기타'), DEFAULT_CATEGORY);
  assert.equal(normalizeCategory(encodeMetadataValue(CATEGORIES[1]), true), CATEGORIES[1]);
});

test('코호트와 분류 필터를 함께 적용한다', () => {
  const games = [
    { key: 'a', affiliation: COHORTS[0], category: CATEGORIES[0] },
    { key: 'b', affiliation: COHORTS[0], category: CATEGORIES[1] },
    { key: 'c', affiliation: COHORTS[1], category: CATEGORIES[1] },
  ];
  assert.deepEqual(filterGames(games, { category: CATEGORIES[1] }).map((game) => game.key), ['b', 'c']);
  assert.deepEqual(filterGames(games, { cohort: COHORTS[0], category: CATEGORIES[1] }).map((game) => game.key), ['b']);
  assert.deepEqual(filterGames(games), games);
});

test('게임은 업로드 시각 내림차순으로 정렬한다', () => {
  const games = sortGames([
    { key: 'old', uploadedAt: '2026-07-12T01:00:00.000Z' },
    { key: 'invalid', uploadedAt: '' },
    { key: 'new', uploadedAt: '2026-07-12T03:00:00.000Z' },
  ]);
  assert.deepEqual(games.map((game) => game.key), ['new', 'old', 'invalid']);
});

test('DRY_RUN 로그는 손상된 줄을 건너뛰고 최신순으로 파싱한다', () => {
  const contents = [
    JSON.stringify({ key: 'games/old.html', url: '/old', name: '가', affiliation: COHORTS[0], uploadedAt: '2026-07-12T01:00:00.000Z' }),
    '{broken-json',
    JSON.stringify({ key: 'games/new.html', url: '/new', name: '나', affiliation: COHORTS[1], category: CATEGORIES[1], uploadedAt: '2026-07-12T02:00:00.000Z' }),
  ].join('\n');
  const games = parseUploadLog(contents);
  assert.deepEqual(games.map((game) => game.key), ['games/new.html', 'games/old.html']);
  assert.equal(games[0].affiliation, COHORTS[1]);
  assert.equal(games[0].category, CATEGORIES[1]);
  assert.equal(games[1].category, DEFAULT_CATEGORY);
});

test('콘텐츠 key는 지정된 games 경로만 허용한다', () => {
  assert.equal(isValidContentKey('games/20260712050607-ab12.html'), true);
  for (const key of ['games/example.html', '../games/20260712050607-ab12.html', 'games/20260712050607-AB12.html', 'other/20260712050607-ab12.html']) {
    assert.equal(isValidContentKey(key), false, key);
  }
});

test('피드백은 trim하고 빈 닉네임을 익명으로 바꾼다', () => {
  const result = validateFeedbackInput({ nickname: '  ', message: ' 좋아요! ' });
  assert.deepEqual(result.errors, []);
  assert.equal(result.nickname, '익명');
  assert.equal(result.message, '좋아요!');
});

test('빈 피드백과 501자 및 21자 닉네임은 거부한다', () => {
  assert.equal(validateFeedbackInput({ message: '   ' }).errors[0], '피드백은 1~500자로 입력하세요.');
  assert.equal(validateFeedbackInput({ message: '가'.repeat(501) }).errors[0], '피드백은 1~500자로 입력하세요.');
  assert.equal(validateFeedbackInput({ nickname: '나'.repeat(21), message: 'ok' }).errors[0], '닉네임은 20자 이하로 입력하세요.');
});

test('피드백 JSONL은 key별 오래된 순이며 손상 줄을 건너뛴다', () => {
  const key = 'games/20260712050607-ab12.html';
  const contents = [
    JSON.stringify({ contentKey: key, createdAt: '2026-07-12T02:00:00.000Z', nickname: '나', message: '둘' }),
    '{broken',
    JSON.stringify({ contentKey: 'games/20260712050607-cd34.html', createdAt: '2026-07-12T00:00:00.000Z', nickname: '타인', message: '제외' }),
    JSON.stringify({ contentKey: key, createdAt: '2026-07-12T01:00:00.000Z', nickname: '가', message: '하나' }),
  ].join('\n');
  assert.deepEqual(parseFeedbackLog(contents, key).map((item) => item.message), ['하나', '둘']);
});

test('S3 모드 URL은 버킷 웹사이트 루트에 직접 연결한다', () => {
  const previousBucket = process.env.S3_BUCKET;
  const previousBaseUrl = process.env.BASE_URL;
  process.env.S3_BUCKET = 'nxt-ai-literacy-games';
  process.env.BASE_URL = 'http://bucket.s3-website.ap-northeast-2.amazonaws.com/';
  assert.equal(publicUrl('games/example.html'), 'http://bucket.s3-website.ap-northeast-2.amazonaws.com/games/example.html');
  process.env.S3_BUCKET = previousBucket;
  process.env.BASE_URL = previousBaseUrl;
});
