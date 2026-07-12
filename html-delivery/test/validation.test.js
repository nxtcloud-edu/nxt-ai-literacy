const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_FILE_SIZE, createObjectKey, encodeMetadataValue, publicUrl, validateUploadInput } = require('../server');

function file(name = 'game.html', size = 10) {
  return { originalname: name, size };
}

test('정상 입력은 trim 후 통과한다', () => {
  const result = validateUploadInput({ affiliation: '  1팀 ', name: ' 홍길동 ', file: file() });
  assert.deepEqual(result.errors, []);
  assert.equal(result.affiliation, '1팀');
  assert.equal(result.name, '홍길동');
});

test('비HTML 파일은 거부한다', () => {
  const result = validateUploadInput({ affiliation: '1팀', name: '홍길동', file: file('game.txt') });
  assert.match(result.errors[0], /HTML/);
});

test('1MB 초과 파일은 거부한다', () => {
  const result = validateUploadInput({ affiliation: '1팀', name: '홍길동', file: file('game.html', MAX_FILE_SIZE + 1) });
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
  assert.equal(decodeURIComponent(encoded), '서울 1팀/홍길동');
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
