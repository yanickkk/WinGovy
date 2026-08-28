/**
 * Gemini API 프록시 Worker
 * ────────────────────────────────────────────────────────────
 * 이 Worker는 브라우저(정적 사이트)와 Gemini API 사이에서 중계 역할을 합니다.
 * 실제 Gemini API 키는 Worker의 Secret(GEMINI_API_KEY)에만 저장되며,
 * 어떤 응답에도 키 값 자체가 포함되지 않으므로 방문자는 절대 키를 볼 수 없습니다.
 *
 * 배포 방법은 상위 폴더의 README_WORKER_설정방법.md 를 참고하세요.
 */

// 이 프록시로 호출할 수 있는 Gemini 모델을 화이트리스트로 제한합니다.
// (누군가 임의의 모델명을 넣어 다른 용도로 키를 남용하는 것을 방지)
const ALLOWED_MODELS = new Set([
  'gemini-3-flash-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-image',
]);

function corsHeaders(origin, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || '*';
  // ALLOWED_ORIGIN이 설정돼 있으면 그 origin만 허용하고, 아니면 전체 허용(*)합니다.
  const allowOrigin = allowedOrigin === '*' ? '*' : (origin === allowedOrigin ? allowedOrigin : allowedOrigin);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname !== '/api/gemini') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }

    // 허용된 origin에서만 호출을 받고 싶다면 ALLOWED_ORIGIN을 설정하세요 (선택사항이지만 강력 권장).
    if (env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== '*' && origin !== env.ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: GEMINI_API_KEY not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }

    const { model, payload } = body || {};

    if (!model || !ALLOWED_MODELS.has(model)) {
      return new Response(JSON.stringify({ error: 'Model not allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    try {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });

      const text = await geminiRes.text();

      return new Response(text, {
        status: geminiRes.status,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream request failed', detail: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }
  },
};
