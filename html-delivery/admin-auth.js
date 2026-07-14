const crypto = require('node:crypto');
const { verifyPassword } = require('./registry');
const { clientIp, createSlidingWindowLimiter } = require('./ratelimit');

const ADMIN_UNCONFIGURED_MESSAGE = '관리자 기능이 설정되지 않았습니다.';
const ADMIN_AUTH_FAILED_MESSAGE = '아이디 또는 비밀번호가 맞지 않아요.';
const ADMIN_CURRENT_PASSWORD_FAILED_MESSAGE = '현재 비밀번호가 맞지 않아요.';
const ADMIN_NEW_PASSWORD_INVALID_MESSAGE = '새 비밀번호는 8~72자이고 현재 비밀번호와 달라야 해요.';
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payloadBase64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

function createSessionToken({ now = Date.now, secret = process.env.SESSION_SECRET } = {}) {
  const payload = JSON.stringify({ exp: Math.floor((now() + SESSION_TTL_MS) / 1000) });
  const payloadBase64 = base64url(payload);
  return `${payloadBase64}.${signPayload(payloadBase64, secret)}`;
}

function timingSafeStringEqual(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function verifySessionToken(token, { now = Date.now, secret = process.env.SESSION_SECRET } = {}) {
  if (typeof token !== 'string') return false;
  const [payloadBase64, signature, extra] = token.split('.');
  if (!payloadBase64 || !signature || extra !== undefined) return false;
  const expectedSignature = signPayload(payloadBase64, secret);
  if (!timingSafeStringEqual(signature, expectedSignature)) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')); }
  catch { return false; }
  return Number.isFinite(payload.exp) && payload.exp > Math.floor(now() / 1000);
}

function parseCookies(cookieHeader) {
  if (typeof cookieHeader !== 'string' || !cookieHeader) return {};
  return cookieHeader.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index === -1) return cookies;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) cookies[name] = value;
    return cookies;
  }, {});
}

function adminConfig() {
  const { ADMIN_ID, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT, SESSION_SECRET } = process.env;
  if (!ADMIN_ID || !ADMIN_PASSWORD_HASH || !ADMIN_PASSWORD_SALT || !SESSION_SECRET) return null;
  return { id: ADMIN_ID, passwordHash: ADMIN_PASSWORD_HASH, salt: ADMIN_PASSWORD_SALT, sessionSecret: SESSION_SECRET };
}

async function resolveActiveCredential(config, getAdminCredential) {
  const override = await getAdminCredential();
  if (!override) return config;
  return { id: config.id, passwordHash: override.passwordHash, salt: override.salt, sessionSecret: config.sessionSecret };
}

function sessionCookie(value) {
  const secure = process.env.S3_BUCKET ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function expiredSessionCookie() {
  const secure = process.env.S3_BUCKET ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

function validNewAdminPassword(currentPassword, newPassword) {
  return typeof newPassword === 'string'
    && newPassword.length >= 8
    && newPassword.length <= 72
    && newPassword !== currentPassword;
}

function createAdminAuth(deps = {}) {
  const { getAdminCredential, saveAdminCredential, hashPassword, auditAdminAction = () => {} } = deps;
  if (typeof getAdminCredential !== 'function') throw new TypeError('getAdminCredential dependency is required');
  if (typeof saveAdminCredential !== 'function') throw new TypeError('saveAdminCredential dependency is required');
  if (typeof hashPassword !== 'function') throw new TypeError('hashPassword dependency is required');
  const loginByIp = createSlidingWindowLimiter({ limit: 5, windowMs: 60_000 });

  function requireConfigured(_req, res) {
    const config = adminConfig();
    if (!config) {
      res.status(503).json({ error: ADMIN_UNCONFIGURED_MESSAGE });
      return null;
    }
    return config;
  }

  function requireAdmin(req, res, next) {
    const config = requireConfigured(req, res);
    if (!config) return;
    const token = parseCookies(req.get('cookie'))[SESSION_COOKIE_NAME];
    if (!verifySessionToken(token, { secret: config.sessionSecret })) return res.status(401).json({ error: ADMIN_AUTH_FAILED_MESSAGE });
    return next();
  }

  async function login(req, res, next) {
    try {
      const config = requireConfigured(req, res);
      if (!config) return;
      if (!loginByIp.consume(clientIp(req))) return res.status(429).json({ error: '잠시 후 다시 시도해 주세요.' });
      const credential = await resolveActiveCredential(config, getAdminCredential);
      const body = req.body || {};
      const idMatches = timingSafeStringEqual(body.id, credential.id);
      const passwordMatches = typeof body.password === 'string' && verifyPassword(body.password, credential.passwordHash, credential.salt);
      if (!idMatches || !passwordMatches) return res.status(401).json({ error: ADMIN_AUTH_FAILED_MESSAGE });
      const token = createSessionToken({ secret: credential.sessionSecret });
      res.set('Set-Cookie', sessionCookie(token));
      return res.json({ ok: true });
    } catch (error) { return next(error); }
  }

  async function changePassword(req, res, next) {
    try {
      const config = requireConfigured(req, res);
      if (!config) return;
      const credential = await resolveActiveCredential(config, getAdminCredential);
      const body = req.body || {};
      const currentPassword = body.currentPassword;
      const newPassword = body.newPassword;
      if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, credential.passwordHash, credential.salt)) {
        return res.status(401).json({ error: ADMIN_CURRENT_PASSWORD_FAILED_MESSAGE });
      }
      if (!validNewAdminPassword(currentPassword, newPassword)) {
        return res.status(400).json({ error: ADMIN_NEW_PASSWORD_INVALID_MESSAGE });
      }
      const nextCredential = { ...hashPassword(newPassword), updatedAt: new Date().toISOString() };
      await saveAdminCredential(nextCredential);
      auditAdminAction('change-password', null);
      return res.json({ ok: true });
    } catch (error) { return next(error); }
  }

  function logout(_req, res) {
    res.set('Set-Cookie', expiredSessionCookie());
    return res.json({ ok: true });
  }

  return { changePassword, login, logout, requireAdmin };
}

module.exports = { ADMIN_AUTH_FAILED_MESSAGE, ADMIN_CURRENT_PASSWORD_FAILED_MESSAGE, ADMIN_NEW_PASSWORD_INVALID_MESSAGE, ADMIN_UNCONFIGURED_MESSAGE, SESSION_COOKIE_NAME, SESSION_TTL_MS, createAdminAuth, createSessionToken, expiredSessionCookie, parseCookies, resolveActiveCredential, sessionCookie, timingSafeStringEqual, validNewAdminPassword, verifySessionToken };
