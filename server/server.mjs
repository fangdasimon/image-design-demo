import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InferenceClient } from '@huggingface/inference';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(rootDir, 'server/.env');
loadDotEnv(envPath);

const port = Number(process.env.PORT || 4300);
const model = process.env.HF_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0';
const configuredToken = (process.env.HF_TOKEN || '').trim();
const token = configuredToken && !configuredToken.includes('your_rotated_token_here') ? configuredToken : '';
const client = token ? new InferenceClient(token) : null;
const maxBodyBytes = 32 * 1024;

const server = createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, { ok: true, configured: Boolean(client), model });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/ai/generate') {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  if (!client) {
    sendJson(response, 401, {
      code: 'missing_token',
      error: 'The AI proxy is running, but HF_TOKEN is not configured in server/.env.'
    });
    return;
  }

  try {
    const body = await readJson(request);
    const prompt = typeof body.inputs === 'string' ? body.inputs.trim() : '';
    const parameters = body.parameters && typeof body.parameters === 'object' ? body.parameters : {};

    if (!prompt || prompt.length > 240) {
      sendJson(response, 400, { code: 'invalid_prompt', error: 'Prompt must contain 1 to 240 characters.' });
      return;
    }

    const guidanceScale = clampNumber(parameters.guidance_scale, 1, 20, 7.5);
    const steps = clampNumber(parameters.num_inference_steps, 1, 50, 30);
    const image = await client.textToImage({
      provider: 'auto',
      model,
      inputs: prompt,
      parameters: {
        guidance_scale: guidanceScale,
        num_inference_steps: steps
      }
    });
    const buffer = Buffer.from(await image.arrayBuffer());
    const contentType = image.type || 'image/png';

    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store'
    });
    response.end(buffer);
  } catch (error) {
    const status = getErrorStatus(error);
    sendJson(response, status, { code: getErrorCode(status), error: getSafeErrorMessage(error, status) });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Creation AI proxy listening on http://127.0.0.1:${port}`);
  console.log(`Hugging Face token: ${client ? 'configured' : 'missing (the UI will show an actionable error)'}`);
});

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

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
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

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  response.end(body);
}

function getErrorStatus(error) {
  const status = Number(error?.status ?? error?.statusCode);
  if ([400, 401, 403, 408, 413, 429].includes(status) || status >= 500) return status;
  return 502;
}

function getErrorCode(status) {
  if (status === 401 || status === 403) return 'authentication';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'provider_unavailable';
  return 'provider_error';
}

function getSafeErrorMessage(error, status) {
  if (status === 401 || status === 403) return 'The Hugging Face token was rejected or lacks Inference Providers permission.';
  if (status === 429) return 'The model quota is busy. Wait a moment and try again.';
  if (status >= 500) return 'The selected Hugging Face provider is temporarily unavailable.';
  return error instanceof Error ? error.message : 'The AI provider returned an unknown error.';
}
