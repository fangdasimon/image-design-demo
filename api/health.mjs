import { getAiConfig } from '../server/ai-generation.mjs';

const aiConfig = getAiConfig();

export default function handler(request, response) {
  setHeaders(response, corsHeaders());
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }
  if (request.method !== 'GET') {
    sendJson(response, { error: 'Method not allowed.' }, 405);
    return;
  }

  sendJson(response, {
    ok: true,
    configured: Boolean(aiConfig.client),
    model: aiConfig.textModel,
    imageModel: aiConfig.imageModel,
    imageProvider: aiConfig.imageProvider
  }, 200);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin'
  };
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
