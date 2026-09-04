export const environment = {
  production: false,
  // The browser talks to the local proxy; the proxy reads HF_TOKEN from server/.env.
  aiMode: 'proxy' as 'proxy' | 'demo',
  aiApiUrl: '/api/ai/generate'
};
