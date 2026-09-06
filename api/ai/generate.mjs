import {
  generateImage,
  getAiConfig,
  getErrorCode,
  getErrorStatus,
  getSafeErrorMessage
} from '../../server/ai-generation.mjs';

const aiConfig = getAiConfig();
const MAX_BODY_BYTES = 12 * 1024 * 1024;

export default async function handler(request, response) {
  setHeaders(response, corsHeaders());
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }
  if (request.method !== 'POST') {
    sendJson(response, { error: 'Method not allowed.' }, 405);
    return;
  }

  try {
    const body = await readBody(request);
    const { buffer, contentType } = await generateImage(body, aiConfig);
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'no-store');
    response.end(buffer);
  } catch (error) {
    const status = getErrorStatus(error);
    sendJson(response, { code: getErrorCode(status, error), error: getSafeErrorMessage(error, status) }, status);
  }
}

function corsHeaders() {
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin'
  };
  const allowedOrigin = process.env.CORS_ORIGIN?.trim();
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
  return headers;
}

async function readBody(request) {
  const contentLength = Number(readHeader(request, 'content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  if (request.body && typeof request.body === 'object') {
    const serializedBody = JSON.stringify(request.body) || '';
    if (Buffer.byteLength(serializedBody, 'utf8') > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
    return request.body;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function readHeader(request, name) {
  if (typeof request.headers?.get === 'function') return request.headers.get(name);
  return request.headers?.[name] || request.headers?.[name.toLowerCase()];
}

function sendJson(response, payload, status) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function setHeaders(response, headers) {
  Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
}
