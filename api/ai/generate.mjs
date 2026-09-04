import {
  generateImage,
  getAiConfig,
  getErrorCode,
  getErrorStatus,
  getSafeErrorMessage
} from '../../server/ai-generation.mjs';

const aiConfig = getAiConfig();

export default async function handler(request) {
  const headers = corsHeaders();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);

  try {
    const body = await request.json();
    const { buffer, contentType } = await generateImage(body, aiConfig);
    return new Response(buffer, {
      status: 200,
      headers: { ...headers, 'Content-Type': contentType, 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    const status = getErrorStatus(error);
    return json({ code: getErrorCode(status, error), error: getSafeErrorMessage(error, status) }, status, headers);
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

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
