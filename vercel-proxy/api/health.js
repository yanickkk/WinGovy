// Vercel Serverless Function: /api/health
// 브라우저에서 https://<your-project>.vercel.app/api/health 로 직접 열어서
// 배포 상태(키 등록 여부, 허용 origin)를 확인할 수 있습니다. 키 값 자체는 노출하지 않습니다.

module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);

  res.status(200).json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    allowedOrigin: process.env.ALLOWED_ORIGIN || '(제한 없음 - 모든 origin 허용)',
    requestOrigin: req.headers.origin || '(Origin 헤더 없음)',
    region: process.env.VERCEL_REGION || '(알 수 없음)',
  });
};
