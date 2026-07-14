const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createAdminAuth, SESSION_COOKIE_NAME, SESSION_TTL_MS, createSessionToken, parseCookies, sessionCookie, timingSafeStringEqual, verifySessionToken } = require('../admin-auth');
const { hashPassword, verifyPassword } = require('../registry');

function runtimeSecret() { return crypto.randomBytes(18).toString('base64url'); }

function configuredSecretPair() {
  const secret = runtimeSecret();
  return { secret, ...hashPassword(secret) };
}

function withEnvConfig(pair = configuredSecretPair()) {
  const previous = {
    ADMIN_ID: process.env.ADMIN_ID,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    ADMIN_PASSWORD_SALT: process.env.ADMIN_PASSWORD_SALT,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
  process.env.ADMIN_ID = runtimeSecret();
  process.env.ADMIN_PASSWORD_HASH = pair.passwordHash;
  process.env.ADMIN_PASSWORD_SALT = pair.salt;
  process.env.SESSION_SECRET = runtimeSecret();
  return {
    id: process.env.ADMIN_ID,
    secret: pair.secret,
    restore() {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
    },
  };
}

function req({ body = {}, cookie = '', ip = '127.0.0.1' } = {}) {
  return { body, ip, get: (name) => (name.toLowerCase() === 'cookie' ? cookie : '') };
}

function res() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function call(handler, request) {
  const response = res();
  await handler(request, response, (error) => { if (error) throw error; });
  return response;
}

test('관리자 세션 토큰은 서명된 payload와 12시간 만료를 검증한다', () => {
  const secret = runtimeSecret();
  const now = () => 1_800_000_000_000;
  const token = createSessionToken({ now, secret });
  const [payloadBase64] = token.split('.');
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

  assert.equal(payload.exp, Math.floor((now() + SESSION_TTL_MS) / 1000));
  assert.equal(verifySessionToken(token, { now, secret }), true);
});

test('관리자 세션 토큰은 변조와 만료를 거부한다', () => {
  const secret = runtimeSecret();
  const nowValue = 1_800_000_000_000;
  const token = createSessionToken({ now: () => nowValue, secret });
  const [payloadBase64, signature] = token.split('.');
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
  const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, exp: payload.exp + 60 })).toString('base64url');

  assert.equal(verifySessionToken(`${tamperedPayload}.${signature}`, { now: () => nowValue, secret }), false);
  assert.equal(verifySessionToken(token, { now: () => nowValue + SESSION_TTL_MS, secret }), false);
});

test('쿠키 파서는 수동으로 admin_session 값을 찾고 쿠키 속성을 고정한다', () => {
  const token = createSessionToken({ secret: runtimeSecret() });
  assert.equal(parseCookies(`theme=dark; ${SESSION_COOKIE_NAME}=${token}; flag=1`)[SESSION_COOKIE_NAME], token);
  assert.equal(sessionCookie(token).includes('HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'), true);
});

test('관리자 id 비교와 비밀번호 검증은 런타임 생성 secret으로 성공/실패를 판정한다', () => {
  const id = runtimeSecret();
  const pair = configuredSecretPair();
  assert.equal(timingSafeStringEqual(id, id), true);
  assert.equal(timingSafeStringEqual(runtimeSecret(), id), false);
  assert.equal(hashPassword(pair.secret, pair.salt).passwordHash, pair.passwordHash);
});

test('관리자 로그인은 오버라이드가 있으면 오버라이드 자격을 env보다 우선한다', async () => {
  const envPair = configuredSecretPair();
  const overridePair = configuredSecretPair();
  const env = withEnvConfig(envPair);
  let override = { passwordHash: overridePair.passwordHash, salt: overridePair.salt };
  const auth = createAdminAuth({
    getAdminCredential: async () => override,
    saveAdminCredential: async () => {},
    hashPassword,
  });
  try {
    const envLogin = await call(auth.login, req({ body: { id: env.id, password: env.secret } }));
    assert.equal(envLogin.statusCode, 401);

    const overrideLogin = await call(auth.login, req({ body: { id: env.id, password: overridePair.secret } }));
    assert.equal(overrideLogin.statusCode, 200);
    assert.match(overrideLogin.headers['set-cookie'], /admin_session=/);

    override = null;
    const fallbackLogin = await call(auth.login, req({ body: { id: env.id, password: env.secret } }));
    assert.equal(fallbackLogin.statusCode, 200);
  } finally {
    env.restore();
  }
});

test('change-password는 현재 비밀번호와 새 비밀번호를 검증하고 해시/솔트만 저장한다', async () => {
  const currentPair = configuredSecretPair();
  const env = withEnvConfig(currentPair);
  let saved = null;
  const auditLogs = [];
  const auth = createAdminAuth({
    getAdminCredential: async () => saved,
    saveAdminCredential: async (credential) => { saved = credential; },
    hashPassword,
    auditAdminAction: (admin_action, contentId) => auditLogs.push({ admin_action, contentId }),
  });
  const cookie = sessionCookie(createSessionToken({ secret: process.env.SESSION_SECRET }));
  const newSecret = runtimeSecret();
  try {
    const badCurrent = await call(auth.changePassword, req({ cookie, body: { currentPassword: runtimeSecret(), newPassword: newSecret } }));
    assert.equal(badCurrent.statusCode, 401);
    assert.equal(badCurrent.body.error, '현재 비밀번호가 맞지 않아요.');

    for (const invalid of ['short7', currentPair.secret, `${runtimeSecret()}${'x'.repeat(80)}`]) {
      const rejected = await call(auth.changePassword, req({ cookie, body: { currentPassword: currentPair.secret, newPassword: invalid } }));
      assert.equal(rejected.statusCode, 400);
      assert.equal(rejected.body.error, '새 비밀번호는 8~72자이고 현재 비밀번호와 달라야 해요.');
    }

    const changed = await call(auth.changePassword, req({ cookie, body: { currentPassword: currentPair.secret, newPassword: newSecret } }));
    assert.equal(changed.statusCode, 200);
    assert.deepEqual(changed.body, { ok: true });
    assert.equal(saved.passwordHash === newSecret, false);
    assert.equal(saved.salt === newSecret, false);
    assert.equal(verifyPassword(newSecret, saved.passwordHash, saved.salt), true);
    assert.match(saved.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(auditLogs, [{ admin_action: 'change-password', contentId: null }]);

    const oldLogin = await call(auth.login, req({ body: { id: env.id, password: currentPair.secret } }));
    assert.equal(oldLogin.statusCode, 401);
    const newLogin = await call(auth.login, req({ body: { id: env.id, password: newSecret } }));
    assert.equal(newLogin.statusCode, 200);
  } finally {
    env.restore();
  }
});
