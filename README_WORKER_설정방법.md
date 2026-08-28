# Gemini API 키를 방문자로부터 완전히 숨기는 방법 (Cloudflare Worker 프록시)

## 구조

```
방문자 브라우저 (GitHub Pages의 index.html)
      │  (API 키가 전혀 없는 요청)
      ▼
Cloudflare Worker  ← GEMINI_API_KEY는 여기(서버)에만 저장됨
      │  (여기서만 실제 키를 붙여서 호출)
      ▼
Gemini API
```

`index.html`은 이제 Gemini API를 직접 호출하지 않고, 여러분이 배포할 Cloudflare Worker의
`/api/gemini` 엔드포인트로만 요청을 보냅니다. 실제 Gemini 키는 Worker의 Secret으로만 저장되고
Worker의 응답에도 키 값이 포함되지 않으므로, 브라우저 개발자도구로 아무리 들여다봐도 키를
찾을 수 없습니다.

## 1. Cloudflare Worker 배포하기

Cloudflare 계정은 무료로 만들 수 있고, Worker도 무료 티어(하루 100,000 요청)로 충분합니다.

```bash
cd worker
npm install -g wrangler      # Cloudflare CLI (최초 1회)
wrangler login                # 브라우저로 Cloudflare 로그인

# Gemini API 키를 Secret으로 등록 (프롬프트가 뜨면 키 값 붙여넣기)
wrangler secret put GEMINI_API_KEY

# Worker 배포
wrangler deploy
```

배포가 끝나면 터미널에 다음과 같은 주소가 출력됩니다:

```
https://ai-food-care-gemini-proxy.<your-subdomain>.workers.dev
```

이 주소를 기억해두세요.

## 2. (강력 권장) 아무나 내 Worker를 못 쓰게 제한하기

Worker 자체는 공개 URL이라, 주소를 아는 사람은 누구나 호출해서 여러분의 Gemini 사용량(과 비용)을
소모시킬 수 있습니다. 이를 막으려면 `worker/wrangler.toml`의 주석 처리된 부분처럼
`ALLOWED_ORIGIN`을 여러분의 GitHub Pages 주소로 설정하세요:

```toml
[vars]
ALLOWED_ORIGIN = "https://yourusername.github.io"
```

수정 후 `wrangler deploy`로 다시 배포하면 적용됩니다. (완벽한 방어는 아니지만 무작위 남용은 크게 줄여줍니다. 더 강한 보호가 필요하면 Cloudflare의 Rate Limiting 규칙을 추가로 설정할 수 있습니다.)

## 3. index.html에 Worker 주소 연결하기

`index.html` 상단 `<script>` 안의 다음 줄을 실제 Worker 주소로 바꿔주세요:

```js
const WORKER_URL = "https://YOUR-WORKER-SUBDOMAIN.workers.dev";
```

→

```js
const WORKER_URL = "https://ai-food-care-gemini-proxy.<your-subdomain>.workers.dev";
```

이 값은 비밀이 아니라 그냥 "우리 프록시 서버 주소"이므로 소스코드/GitHub에 그대로 커밋해도 됩니다.

## 4. GitHub Pages 배포

`.github/workflows/deploy.yml`이 main 브랜치 push 시 자동으로 정적 파일을 GitHub Pages에
배포합니다. (Settings → Pages → Source를 "GitHub Actions"로 설정해두세요.) 이 워크플로우는
이제 API 키를 다루지 않으므로 별도 GitHub Secret 설정이 필요 없습니다.

## 5. 나중에 키를 바꾸고 싶을 때

```bash
cd worker
wrangler secret put GEMINI_API_KEY   # 새 키 값 입력
```

코드나 GitHub 저장소를 전혀 건드릴 필요 없이 Worker의 Secret만 교체하면 바로 반영됩니다.

## 참고: 왜 GitHub Pages만으로는 안 되나요?

GitHub Pages는 정적 파일만 호스팅합니다. 브라우저(JS)가 Gemini를 직접 호출하는 구조에서는
어떤 방법을 쓰든 최종적으로 키가 브라우저 메모리/네트워크 요청에 나타날 수밖에 없습니다.
Cloudflare Worker처럼 "요청을 대신 받아서 서버에서 키를 붙여 호출해주는 계층"이 있어야만
브라우저가 키를 아예 모르는 상태로 동작할 수 있습니다.
