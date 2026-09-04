import { getAiConfig } from '../server/ai-generation.mjs';

const aiConfig = getAiConfig();

export default function handler(request) {
  const headers = corsHeaders();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, headers);

  return json({
    ok: true,
    configured: Boolean(aiConfig.client),
    model: aiConfig.textModel,
    imageModel: aiConfig.imageModel,
    imageProvider: aiConfig.imageProvider
  }, 200, headers);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin'
  };
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
