// Vercel Serverless Function: /api/gemini
// ────────────────────────────────────────────────────────────
// Cloudflare Worker에서 "User location is not supported for the API use" 오류가
// 발생하여, 같은 역할을 하는 프록시를 Vercel로 옮겼습니다. 실제 Gemini API 키는
// Vercel 프로젝트의 환경변수(GEMINI_API_KEY)에만 저장되며 브라우저로는 절대 전달되지 않습니다.

const ALLOWED_MODELS = new Set([
  'gemini-3-flash-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-image',
]);

function applyCors(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return allowedOrigin;
}

module.exports = async function handler(req, res) {
  const allowedOrigin = applyCors(req, res);
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (allowedOrigin !== '*' && origin !== allowedOrigin) {
    res.status(403).json({ error: 'Origin not allowed', requestOrigin: origin || '(없음)', allowedOrigin });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'Server misconfigured: GEMINI_API_KEY not set in Vercel project settings' });
    return;
  }

  const { model, payload } = req.body || {};

  if (!model || !ALLOWED_MODELS.has(model)) {
    res.status(400).json({ error: 'Model not allowed', model, allowed: [...ALLOWED_MODELS] });
    return;
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });

    const text = await geminiRes.text();
    res.status(geminiRes.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed', detail: String(err) });
  }
};
