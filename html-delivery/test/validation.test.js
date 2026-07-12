const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_FILE_SIZE, createObjectKey, validateUploadInput } = require('../server');

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
