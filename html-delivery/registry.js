const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const LOCAL_REGISTRY = path.join(__dirname, '.local-registry.json');
const TABLE_NAME = process.env.FEEDBACK_TABLE;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, passwordHash: crypto.scryptSync(password, salt, 32).toString('hex') };
}

function verifyPassword(password, passwordHash, salt) {
  const actual = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(passwordHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function newContentId() {
  return crypto.randomBytes(4).toString('hex');
}

function publicContent(item) {
  if (!item) return null;
  const { passwordHash: _passwordHash, salt: _salt, contentKey: _contentKey, createdAt: _createdAt, ...content } = item;
  return content;
}

async function readLocalRegistry() {
  try { return JSON.parse(await fs.readFile(LOCAL_REGISTRY, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}

async function writeLocalRegistry(registry) {
  await fs.writeFile(LOCAL_REGISTRY, `${JSON.stringify(registry, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function documentClient() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.S3_REGION || 'ap-northeast-2' }));
}

async function listRegistryItems() {
  if (!TABLE_NAME) return Object.values(await readLocalRegistry());
  const response = await documentClient().send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(contentKey, :prefix) AND createdAt = :meta',
    ExpressionAttributeValues: { ':prefix': 'content#', ':meta': 'meta' },
  }));
  return response.Items || [];
}

async function listContents() {
  return (await listRegistryItems()).map(publicContent);
}

async function findByIdentity({ affiliation, name, category }, normalizeCategory = (value) => value) {
  return (await listRegistryItems()).find((item) => item.affiliation === affiliation
    && item.name === name
    && normalizeCategory(item.category) === normalizeCategory(category)) || null;
}

async function getRegistryItem(contentId) {
  if (!TABLE_NAME) return (await readLocalRegistry())[contentId] || null;
  const response = await documentClient().send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { contentKey: `content#${contentId}`, createdAt: 'meta' },
  }));
  return response.Item || null;
}

async function getContent(contentId) {
  return publicContent(await getRegistryItem(contentId));
}

async function saveRegistryItem(item) {
  if (!TABLE_NAME) {
    const registry = await readLocalRegistry();
    registry[item.contentId] = item;
    await writeLocalRegistry(registry);
    return;
  }
  await documentClient().send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

function mergeVersionFields(item, { title, latestVersion, latestKey, updatedAt }) {
  return { ...item, title, latestVersion, latestKey, updatedAt };
}

function mergeAdminContentFields(item, fields) {
  return { ...item, ...fields, updatedAt: fields.updatedAt || item.updatedAt };
}

async function updateRegistryVersion(contentId, fields) {
  if (!TABLE_NAME) {
    const registry = await readLocalRegistry();
    if (!registry[contentId]) return false;
    registry[contentId] = mergeVersionFields(registry[contentId], fields);
    await writeLocalRegistry(registry);
    return true;
  }
  await documentClient().send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { contentKey: `content#${contentId}`, createdAt: 'meta' },
    UpdateExpression: 'SET title = :title, latestVersion = :version, latestKey = :key, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':title': fields.title,
      ':version': fields.latestVersion,
      ':key': fields.latestKey,
      ':updatedAt': fields.updatedAt,
    },
    ConditionExpression: 'attribute_exists(contentKey)',
  }));
  return true;
}

async function updateContentPassword(contentId, credentials) {
  if (!TABLE_NAME) {
    const registry = await readLocalRegistry();
    if (!registry[contentId]) return false;
    registry[contentId] = { ...registry[contentId], ...credentials, updatedAt: credentials.updatedAt };
    await writeLocalRegistry(registry);
    return true;
  }
  try {
    await documentClient().send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { contentKey: `content#${contentId}`, createdAt: 'meta' },
      UpdateExpression: 'SET passwordHash = :passwordHash, salt = :salt, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':passwordHash': credentials.passwordHash,
        ':salt': credentials.salt,
        ':updatedAt': credentials.updatedAt,
      },
      ConditionExpression: 'attribute_exists(contentKey)',
    }));
    return true;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

async function updateContentFields(contentId, fields) {
  if (!TABLE_NAME) {
    const registry = await readLocalRegistry();
    if (!registry[contentId]) return false;
    registry[contentId] = mergeAdminContentFields(registry[contentId], fields);
    await writeLocalRegistry(registry);
    return true;
  }
  const assignments = [];
  const values = {};
  Object.entries(fields).forEach(([key, value]) => {
    assignments.push(`${key} = :${key}`);
    values[`:${key}`] = value;
  });
  try {
    await documentClient().send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { contentKey: `content#${contentId}`, createdAt: 'meta' },
      UpdateExpression: `SET ${assignments.join(', ')}`,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(contentKey)',
    }));
    return true;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

async function deleteRegistryItem(contentId) {
  if (!TABLE_NAME) {
    const registry = await readLocalRegistry();
    if (!registry[contentId]) return false;
    delete registry[contentId];
    await writeLocalRegistry(registry);
    return true;
  }
  try {
    await documentClient().send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { contentKey: `content#${contentId}`, createdAt: 'meta' },
      ConditionExpression: 'attribute_exists(contentKey)',
    }));
    return true;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

async function incrementLike(contentId) {
  if (!TABLE_NAME) {
    const registry = await readLocalRegistry();
    const item = registry[contentId];
    if (!item) return null;
    item.likes += 1;
    await writeLocalRegistry(registry);
    return item.likes;
  }
  try {
    const response = await documentClient().send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { contentKey: `content#${contentId}`, createdAt: 'meta' },
      UpdateExpression: 'ADD likes :one',
      ExpressionAttributeValues: { ':one': 1 },
      ConditionExpression: 'attribute_exists(contentKey)',
      ReturnValues: 'UPDATED_NEW',
    }));
    return response.Attributes.likes;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') return null;
    throw error;
  }
}

module.exports = { LOCAL_REGISTRY, deleteRegistryItem, findByIdentity, getContent, getRegistryItem, hashPassword, incrementLike, listContents, mergeAdminContentFields, mergeVersionFields, newContentId, publicContent, saveRegistryItem, updateContentFields, updateContentPassword, updateRegistryVersion, verifyPassword };
