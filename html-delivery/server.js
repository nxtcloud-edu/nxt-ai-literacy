const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const {
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

const PORT = Number(process.env.PORT || 3210);
const MAX_FILE_SIZE = 1024 * 1024;
const COHORTS = ['2026-고대세종-ai', '2026-한이음-ai-중급'];
const UNKNOWN_METADATA = '알 수 없음';
const LOCAL_DEPLOY_DIR = path.join(__dirname, '.local-deploy');
const UPLOAD_LOG = path.join(__dirname, 'uploads.log.jsonl');

function validateUploadInput({ affiliation, name, file }) {
  const errors = [];
  const trimmedAffiliation = typeof affiliation === 'string' ? affiliation.trim() : '';
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!COHORTS.includes(trimmedAffiliation)) errors.push('등록된 수업(코호트)을 선택하세요.');
  if (!trimmedName || trimmedName.length > 40) errors.push('이름은 1~40자로 입력하세요.');
  if (!file) errors.push('HTML 파일을 선택하세요.');
  else {
    if (path.extname(file.originalname).toLowerCase() !== '.html') errors.push('HTML 파일만 업로드할 수 있습니다.');
    if (file.size > MAX_FILE_SIZE) errors.push('파일 크기는 1MB 이하여야 합니다.');
  }
  return { errors, affiliation: trimmedAffiliation, name: trimmedName };
}

function createObjectKey(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const random = crypto.randomBytes(2).toString('hex');
  return `games/${stamp}-${random}.html`;
}

function publicUrl(key) {
  const baseUrl = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
  return process.env.S3_BUCKET ? `${baseUrl}/${key}` : `${baseUrl}/deployed/${key}`;
}

function encodeMetadataValue(value) {
  return encodeURIComponent(value);
}

function decodeMetadataValue(value) {
  if (typeof value !== 'string' || value.length === 0) return UNKNOWN_METADATA;
  try {
    return decodeURIComponent(value);
  } catch {
    return UNKNOWN_METADATA;
  }
}

function sortGames(games) {
  return [...games].sort((a, b) => {
    const aTime = Date.parse(a.uploadedAt) || 0;
    const bTime = Date.parse(b.uploadedAt) || 0;
    return bTime - aTime;
  });
}

function parseUploadLog(contents) {
  const games = contents
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const entry = JSON.parse(line);
        if (!entry.key) return [];
        return [{
          key: entry.key,
          url: entry.url || publicUrl(entry.key),
          name: entry.name || UNKNOWN_METADATA,
          affiliation: entry.affiliation || UNKNOWN_METADATA,
          uploadedAt: entry.uploadedAt || '',
        }];
      } catch {
        return [];
      }
    });
  return sortGames(games);
}

async function listLocalGames() {
  try {
    return parseUploadLog(await fs.readFile(UPLOAD_LOG, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function listS3Games() {
  const client = new S3Client({ region: process.env.S3_REGION || 'ap-northeast-2' });
  const listed = await client.send(new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET,
    Prefix: 'games/',
    MaxKeys: 1000,
  }));
  const games = await Promise.all((listed.Contents || []).flatMap((object) => {
    if (!object.Key) return [];
    return [client.send(new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: object.Key,
    })).then((head) => {
      const metadata = head.Metadata || {};
      return {
        key: object.Key,
        url: publicUrl(object.Key),
        name: decodeMetadataValue(metadata.name),
        affiliation: decodeMetadataValue(metadata.affiliation),
        uploadedAt: metadata.uploadedat || object.LastModified?.toISOString() || '',
      };
    }).catch(() => ({
      key: object.Key,
      url: publicUrl(object.Key),
      name: UNKNOWN_METADATA,
      affiliation: UNKNOWN_METADATA,
      uploadedAt: object.LastModified?.toISOString() || '',
    }))];
  }));
  return sortGames(games);
}

async function listGames() {
  return process.env.S3_BUCKET ? listS3Games() : listLocalGames();
}

async function appendUploadLog(entry) {
  await fs.appendFile(UPLOAD_LOG, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function saveLocally(key, buffer) {
  const destination = path.join(LOCAL_DEPLOY_DIR, key);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);
}

async function saveToS3(key, buffer, metadata) {
  const client = new S3Client({ region: process.env.S3_REGION || 'ap-northeast-2' });
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'text/html; charset=utf-8',
    Metadata: metadata,
  }));
}

async function storeUpload({ key, buffer, affiliation, name, uploadedAt }) {
  const metadata = {
    affiliation: encodeMetadataValue(affiliation),
    name: encodeMetadataValue(name),
    uploadedAt,
  };
  if (process.env.S3_BUCKET) {
    await saveToS3(key, buffer, metadata);
    try {
      await appendUploadLog({ affiliation, name, key, url: publicUrl(key), uploadedAt });
    } catch (error) {
      console.warn('업로드 로그 기록 실패:', error);
    }
  } else {
    await saveLocally(key, buffer);
    await appendUploadLog({ affiliation, name, key, url: publicUrl(key), uploadedAt });
  }
}

function createApp() {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/cohorts', (_req, res) => res.json({ cohorts: COHORTS }));
  app.get('/api/games', async (_req, res, next) => {
    try {
      return res.json({ games: await listGames() });
    } catch (error) {
      return next(error);
    }
  });
  app.get('/deployed/*splat', async (req, res, next) => {
    try {
      const key = Array.isArray(req.params.splat) ? req.params.splat.join('/') : req.params.splat;
      const filePath = path.join(LOCAL_DEPLOY_DIR, key);
      if (!filePath.startsWith(`${LOCAL_DEPLOY_DIR}${path.sep}`)) return res.sendStatus(404);
      const contents = await fs.readFile(filePath);
      return res.type('html').send(contents);
    } catch (error) {
      if (error.code === 'ENOENT') return res.sendStatus(404);
      return next(error);
    }
  });
  app.post('/api/upload', upload.single('file'), async (req, res, next) => {
    try {
      const result = validateUploadInput({ ...req.body, file: req.file });
      if (result.errors.length) return res.status(400).json({ error: result.errors[0], details: result.errors });
      const key = createObjectKey();
      const uploadedAt = new Date().toISOString();
      await storeUpload({ key, buffer: req.file.buffer, affiliation: result.affiliation, name: result.name, uploadedAt });
      return res.status(201).json({ url: publicUrl(key), key, uploadedAt });
    } catch (error) { return next(error); }
  });
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: '파일 크기는 1MB 이하여야 합니다.' });
    console.error(error);
    return res.status(500).json({ error: '업로드 처리 중 오류가 발생했습니다.' });
  });
  return app;
}

if (require.main === module) createApp().listen(PORT, () => console.log(`html-delivery 서버 실행: http://localhost:${PORT}`));

module.exports = {
  COHORTS,
  MAX_FILE_SIZE,
  UNKNOWN_METADATA,
  createApp,
  createObjectKey,
  decodeMetadataValue,
  encodeMetadataValue,
  parseUploadLog,
  publicUrl,
  sortGames,
  validateUploadInput,
};
