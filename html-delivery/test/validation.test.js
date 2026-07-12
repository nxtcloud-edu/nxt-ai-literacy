const test = require('node:test');
const assert = require('node:assert/strict');
const {
  COHORTS,
  MAX_FILE_SIZE,
  UNKNOWN_METADATA,
  createObjectKey,
  decodeMetadataValue,
  encodeMetadataValue,
  parseUploadLog,
  publicUrl,
  sortGames,
  validateUploadInput,
} = require('../server');

function file(name = 'game.html', size = 10) {
  return { originalname: name, size };
}

test('정상 입력은 trim 후 통과한다', () => {
  const result = validateUploadInput({ affiliation: `  ${COHORTS[0]} `, name: ' 홍길동 ', file: file() });
  assert.deepEqual(result.errors, []);
  assert.equal(result.affiliation, COHORTS[0]);
  assert.equal(result.name, '홍길동');
});

test('등록되지 않은 코호트는 거부한다', () => {
  const result = validateUploadInput({ affiliation: '2026-다른수업', name: '홍길동', file: file() });
  assert.equal(result.errors[0], '등록된 수업(코호트)을 선택하세요.');
});

test('비HTML 파일은 거부한다', () => {
  const result = validateUploadInput({ affiliation: COHORTS[0], name: '홍길동', file: file('game.txt') });
  assert.match(result.errors[0], /HTML/);
});

test('1MB 초과 파일은 거부한다', () => {
  const result = validateUploadInput({ affiliation: COHORTS[1], name: '홍길동', file: file('game.html', MAX_FILE_SIZE + 1) });
  assert.match(result.errors[0], /1MB/);
});

test('필드 누락과 공백은 거부한다', () => {
  const result = validateUploadInput({ affiliation: ' ', name: '', file: null });
  assert.equal(result.errors.length, 3);
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
    JSON.stringify({ key: 'games/new.html', url: '/new', name: '나', affiliation: COHORTS[1], uploadedAt: '2026-07-12T02:00:00.000Z' }),
  ].join('\n');
  const games = parseUploadLog(contents);
  assert.deepEqual(games.map((game) => game.key), ['games/new.html', 'games/old.html']);
  assert.equal(games[0].affiliation, COHORTS[1]);
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
