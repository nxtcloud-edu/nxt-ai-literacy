const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createApp } = require('../server');
const { LOCAL_REGISTRY, hashPassword, verifyPassword } = require('../registry');

const LOCAL_DEPLOY_DIR = path.join(__dirname, '../.local-deploy');
const LOCAL_FEEDBACK_LOG = path.join(__dirname, '../.local-feedback.jsonl');

function runtimeSecret() { return crypto.randomBytes(18).toString('base64url'); }

async function cleanLocalState() {
  await fs.rm(LOCAL_REGISTRY, { force: true });
  await fs.rm(LOCAL_FEEDBACK_LOG, { force: true });
  await fs.rm(LOCAL_DEPLOY_DIR, { recursive: true, force: true });
}

function withAdminEnv() {
  const previous = {
    ADMIN_ID: process.env.ADMIN_ID,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    ADMIN_PASSWORD_SALT: process.env.ADMIN_PASSWORD_SALT,
    SESSION_SECRET: process.env.SESSION_SECRET,
    S3_BUCKET: process.env.S3_BUCKET,
    FEEDBACK_TABLE: process.env.FEEDBACK_TABLE,
  };
  const id = runtimeSecret();
  const secret = runtimeSecret();
  const hashed = hashPassword(secret);
  process.env.ADMIN_ID = id;
  process.env.ADMIN_PASSWORD_HASH = hashed.passwordHash;
  process.env.ADMIN_PASSWORD_SALT = hashed.salt;
  process.env.SESSION_SECRET = runtimeSecret();
  delete process.env.S3_BUCKET;
  delete process.env.FEEDBACK_TABLE;
  return {
    id,
    secret,
    restore() {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
    },
  };
}

async function listen(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function login(baseUrl, id, secret) {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, password: secret }),
  });
  return { response, cookie: response.headers.get('set-cookie') };
}

function htmlBlob() {
  return new Blob([`<!doctype html><title>${runtimeSecret()}</title>`], { type: 'text/html' });
}

async function uploadContent(baseUrl, { affiliation = '2026-고대세종-ai', category = '미니게임', name = runtimeSecret().slice(0, 12), title = runtimeSecret().slice(0, 12), secret }) {
  const form = new FormData();
  form.set('affiliation', affiliation);
  form.set('category', category);
  form.set('name', name);
  form.set('title', title);
  form.set('password', secret);
  form.set('file', htmlBlob(), 'content.html');
  const response = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: form });
  return { response, body: await response.json(), identity: { affiliation, category, name } };
}

test('관리자 env가 없으면 admin API가 503을 반환한다', async () => {
  await cleanLocalState();
  const previous = { ADMIN_ID: process.env.ADMIN_ID, ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT: process.env.ADMIN_PASSWORD_SALT, SESSION_SECRET: process.env.SESSION_SECRET };
  delete process.env.ADMIN_ID;
  delete process.env.ADMIN_PASSWORD_HASH;
  delete process.env.ADMIN_PASSWORD_SALT;
  delete process.env.SESSION_SECRET;
  const { server, baseUrl } = await listen(createApp());
  try {
    const response = await fetch(`${baseUrl}/api/admin/session`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, '관리자 기능이 설정되지 않았습니다.');
  } finally {
    await close(server);
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
    await cleanLocalState();
  }
});

test('관리자 로그인은 성공 세션, 실패 401, 분당 제한을 적용한다', async () => {
  await cleanLocalState();
  const admin = withAdminEnv();
  const { server, baseUrl } = await listen(createApp());
  try {
    const failure = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: admin.id, password: runtimeSecret() }),
    });
    assert.equal(failure.status, 401);
    assert.equal((await failure.json()).error, '아이디 또는 비밀번호가 맞지 않아요.');

    const authenticated = await login(baseUrl, admin.id, admin.secret);
    assert.equal(authenticated.response.status, 200);
    assert.match(authenticated.cookie, /admin_session=/);
    assert.match(authenticated.cookie, /HttpOnly; SameSite=Strict; Path=\/; Max-Age=43200/);
    assert.doesNotMatch(authenticated.cookie, /Secure/);

    const session = await fetch(`${baseUrl}/api/admin/session`, { headers: { cookie: authenticated.cookie } });
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), { ok: true });

    for (let index = 0; index < 5; index += 1) {
      await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.24' },
        body: JSON.stringify({ id: runtimeSecret(), password: runtimeSecret() }),
      });
    }
    const limited = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.24' },
      body: JSON.stringify({ id: runtimeSecret(), password: runtimeSecret() }),
    });
    assert.equal(limited.status, 429);
  } finally {
    await close(server);
    admin.restore();
    await cleanLocalState();
  }
});

test('관리 API는 미인증 401, 콘텐츠 수정, 비밀번호 재설정, 피드백 단건 삭제를 처리한다', async () => {
  await cleanLocalState();
  const admin = withAdminEnv();
  const { server, baseUrl } = await listen(createApp());
  const originalLog = console.log;
  console.log = () => {};
  try {
    const ownerSecret = runtimeSecret();
    const created = await uploadContent(baseUrl, { secret: ownerSecret });
    assert.equal(created.response.status, 201);

    const unauthorized = await fetch(`${baseUrl}/api/admin/content/${created.body.contentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: runtimeSecret().slice(0, 12) }),
    });
    assert.equal(unauthorized.status, 401);

    const authenticated = await login(baseUrl, admin.id, admin.secret);
    const cookie = authenticated.cookie;
    const nextTitle = runtimeSecret().slice(0, 12);
    const patched = await fetch(`${baseUrl}/api/admin/content/${created.body.contentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ title: nextTitle }),
    });
    assert.equal(patched.status, 200);
    assert.equal((await patched.json()).content.title, nextTitle);

    const feedback = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentId: created.body.contentId, message: runtimeSecret() }),
    });
    const feedbackBody = await feedback.json();
    assert.equal(feedback.status, 201);

    const deletedFeedback = await fetch(`${baseUrl}/api/admin/feedback`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ contentId: created.body.contentId, createdAt: feedbackBody.feedback.createdAt }),
    });
    assert.equal(deletedFeedback.status, 200);
    const feedbackAfterDelete = await fetch(`${baseUrl}/api/feedback?id=${created.body.contentId}`);
    assert.deepEqual((await feedbackAfterDelete.json()).feedback, []);

    const newOwnerSecret = runtimeSecret();
    const reset = await fetch(`${baseUrl}/api/admin/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ contentId: created.body.contentId, newPassword: newOwnerSecret }),
    });
    assert.equal(reset.status, 200);
    const registry = JSON.parse(await fs.readFile(LOCAL_REGISTRY, 'utf8'));
    assert.equal(verifyPassword(newOwnerSecret, registry[created.body.contentId].passwordHash, registry[created.body.contentId].salt), true);

    const versioned = await uploadContent(baseUrl, { ...created.identity, title: nextTitle, secret: newOwnerSecret });
    assert.equal(versioned.response.status, 201);
    assert.equal(versioned.body.version, 2);
  } finally {
    console.log = originalLog;
    await close(server);
    admin.restore();
    await cleanLocalState();
  }
});

test('관리 콘텐츠 삭제는 로컬 배포 파일, 갤러리, 피드백을 함께 제거한다', async () => {
  await cleanLocalState();
  const admin = withAdminEnv();
  const { server, baseUrl } = await listen(createApp());
  const originalLog = console.log;
  console.log = () => {};
  try {
    const ownerSecret = runtimeSecret();
    const created = await uploadContent(baseUrl, { secret: ownerSecret });
    assert.equal(created.response.status, 201);
    await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentId: created.body.contentId, message: runtimeSecret() }),
    });
    const authenticated = await login(baseUrl, admin.id, admin.secret);
    const deleted = await fetch(`${baseUrl}/api/admin/content/${created.body.contentId}`, {
      method: 'DELETE',
      headers: { cookie: authenticated.cookie },
    });
    assert.equal(deleted.status, 200);
    await assert.rejects(fs.stat(path.join(LOCAL_DEPLOY_DIR, `games/${created.body.contentId}-v1.html`)), { code: 'ENOENT' });

    const gallery = await fetch(`${baseUrl}/api/games`);
    assert.equal((await gallery.json()).games.some((game) => game.contentId === created.body.contentId), false);
    const feedback = await fetch(`${baseUrl}/api/feedback?id=${created.body.contentId}`);
    assert.deepEqual((await feedback.json()).feedback, []);
  } finally {
    console.log = originalLog;
    await close(server);
    admin.restore();
    await cleanLocalState();
  }
});
