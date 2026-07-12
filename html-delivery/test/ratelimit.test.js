const test = require('node:test');
const assert = require('node:assert/strict');
const { clientIp, createSlidingWindowLimiter } = require('../ratelimit');

test('슬라이딩 윈도우 경계가 지난 요청은 제한에서 제외한다', () => {
  let currentTime = 1_000;
  const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 60_000, now: () => currentTime });
  assert.equal(limiter.consume('ip'), true);
  assert.equal(limiter.consume('ip'), true);
  assert.equal(limiter.consume('ip'), false);
  currentTime += 60_000;
  assert.equal(limiter.consume('ip'), true);
});

test('접근 시 만료된 다른 키도 정리한다', () => {
  let currentTime = 0;
  const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 100, now: () => currentTime });
  limiter.consume('old-a');
  limiter.consume('old-b');
  assert.equal(limiter.size(), 2);
  currentTime = 101;
  limiter.consume('new');
  assert.equal(limiter.size(), 1);
});

test('서로 다른 키의 요청 수를 독립적으로 센다', () => {
  const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 1_000, now: () => 10 });
  assert.equal(limiter.consume('ip:content-a'), true);
  assert.equal(limiter.consume('ip:content-a'), false);
  assert.equal(limiter.consume('ip:content-b'), true);
});

test('클라이언트 IP는 x-forwarded-for 첫 값을 우선한다', () => {
  assert.equal(clientIp({ get: () => ' 203.0.113.1, 10.0.0.1 ', ip: '127.0.0.1' }), '203.0.113.1');
  assert.equal(clientIp({ get: () => undefined, ip: '127.0.0.1' }), '127.0.0.1');
});
