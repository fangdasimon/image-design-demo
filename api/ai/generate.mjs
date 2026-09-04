import {
  generateImage,
  getAiConfig,
  getErrorCode,
  getErrorStatus,
  getSafeErrorMessage
} from '../../server/ai-generation.mjs';

const aiConfig = getAiConfig();

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
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin'
  };
}

async function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;

  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
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
