import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateImage,
  getAiConfig,
  getErrorCode,
  getErrorStatus,
  getSafeErrorMessage
} from './ai-generation.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(rootDir, 'server/.env');
loadDotEnv(envPath);

const port = Number(process.env.PORT || 4300);
const host = process.env.HOST || '127.0.0.1';
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const aiConfig = getAiConfig();
const maxBodyBytes = 12 * 1024 * 1024;
const staticRoot = resolve(rootDir, 'dist/creation-image-editor/browser');
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = createServer(async (request, response) => {
  setCorsHeaders(response, request);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'GET' && !request.url?.startsWith('/api')) {
    serveStatic(request, response);
    return;
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      configured: Boolean(aiConfig.client),
      model: aiConfig.textModel,
      imageModel: aiConfig.imageModel,
      imageProvider: aiConfig.imageProvider
    });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/ai/generate') {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  if (!aiConfig.client) {
    sendJson(response, 401, {
      code: 'missing_token',
      error: 'The AI proxy is running, but HF_TOKEN is not configured in server/.env.'
    });
    return;
  }

  try {
    const body = await readJson(request);
    const { buffer, contentType } = await generateImage(body, aiConfig);

    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store'
    });
    response.end(buffer);
  } catch (error) {
    const status = getErrorStatus(error);
    sendJson(response, status, { code: getErrorCode(status, error), error: getSafeErrorMessage(error, status) });
  }
});

server.listen(port, host, () => {
  console.log(`Creation server listening on http://${host}:${port}`);
  console.log(`Hugging Face token: ${aiConfig.client ? 'configured' : 'missing (the UI will show an actionable error)'}`);
});

function serveStatic(request, response) {
  if (!existsSync(staticRoot)) {
    sendJson(response, 404, { error: 'Production assets are not built. Run npm run build first.' });
    return;
  }

  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', `http://${host}:${port}`).pathname);
  } catch {
    sendJson(response, 400, { error: 'Invalid URL.' });
    return;
  }

  const candidate = resolve(staticRoot, `.${pathname}`);
  const isInsideStaticRoot = candidate === staticRoot || candidate.startsWith(`${staticRoot}${sep}`);
  const isFile = isInsideStaticRoot && existsSync(candidate) && statSync(candidate).isFile();
  const filePath = isFile ? candidate : resolve(staticRoot, 'index.html');
  if (!existsSync(filePath)) {
    sendJson(response, 404, { error: 'Production entrypoint is missing.' });
    return;
  }

  const body = readFileSync(filePath);
  const extension = extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable'
  });
  response.end(body);
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function readJson(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    let total = 0;
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      total += Buffer.byteLength(chunk);
      if (total > maxBodyBytes) {
        rejectPromise(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        request.destroy();
        return;
      }
      raw += chunk;
    });
    request.on('end', () => {
      try {
        resolvePromise(JSON.parse(raw || '{}'));
      } catch {
        rejectPromise(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }));
      }
    });
    request.on('error', rejectPromise);
  });
}

function setCorsHeaders(response, request) {
  const requestOrigin = request.headers.origin;
  const allowAllOrigins = corsOrigins.includes('*');
  const allowedOrigin = allowAllOrigins
    ? '*'
    : requestOrigin && corsOrigins.includes(requestOrigin)
      ? requestOrigin
      : null;
  if (allowedOrigin) response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  if (requestOrigin) response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  response.end(body);
}
