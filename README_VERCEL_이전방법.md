# Gemini 프록시를 Vercel로 옮긴 이유 & 배포 방법

## 왜 옮겼나요?

Cloudflare Worker에서 다음과 같은 오류가 발생했습니다:

```
User location is not supported for the API use. (status: FAILED_PRECONDITION)
```

이건 여러분의 실제 위치(한국)와 무관합니다. Gemini API(Google AI Studio 키)는 요청이
도착한 IP의 국가를 보고 지원 지역인지 판단하는데, **Cloudflare Workers의 엣지 IP가
Google 쪽에서 종종 "지원되지 않는 지역"으로 오탐지되는** 사례가 매우 많이 보고되어
있습니다(호주 등 명백히 지원되는 국가에서도 동일 오류가 재현됨). 커뮤니티에서 검증된
해결책이 "Cloudflare 대신 Vercel 등 다른 플랫폼으로 프록시를 옮기는 것"이라, Vercel
서버리스 함수로 동일한 프록시를 다시 만들었습니다.
ai-food-care/                              ← GitHub 저장소 루트
│
├── index.html                             ← 배포되는 실제 웹앱 (GitHub Pages가 서빙)
│
├── .github/
│   └── workflows/
│       └── deploy.yml                     ← push 시 GitHub Pages 자동 배포
│
├── vercel-proxy/                          ← Vercel에 별도로 배포하는 프로젝트
│   ├── api/
│   │   ├── gemini.js                      ← Gemini 호출 프록시 (Vercel 배포용)
│   │   └── health.js                      ← 상태 확인용 엔드포인트
│   ├── vercel.json
│   └── package.json
│
└── README_VERCEL_이전방법.md              ← 배포 안내 문서

## 1. Vercel 계정 만들기 & CLI 설치

```bash
npm install -g vercel
vercel login
```
(https://vercel.com 무료 계정으로 가입 가능합니다.)

## 2. 프로젝트 배포

`vercel-proxy` 폴더로 이동해서 배포합니다.

```bash
cd vercel-proxy
vercel
```

처음 실행하면 몇 가지 질문(프로젝트 이름 등)이 나옵니다. 기본값으로 진행해도 됩니다.
완료되면 미리보기 URL이 나오는데, 실제 운영용 배포는 아래처럼 합니다:

```bash
vercel --prod
```

배포가 끝나면 다음과 같은 주소가 출력됩니다:
```
https://ai-food-care-gemini-proxy-xxxx.vercel.app
```
(또는 프로젝트 이름 그대로 `https://<프로젝트이름>.vercel.app`)

## 3. 환경변수(Gemini API 키) 등록

Vercel 대시보드(https://vercel.com/dashboard) → 방금 만든 프로젝트 클릭
→ **Settings → Environment Variables** 에서:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | 여러분의 Gemini API 키 |
| `ALLOWED_ORIGIN` | `https://yanickkk.github.io` (여러분의 GitHub Pages 주소) |

등록 후 **반드시 재배포**해야 적용됩니다:
```bash
vercel --prod
```

(CLI로 직접 등록하고 싶다면 `vercel env add GEMINI_API_KEY production` 명령도 가능합니다.)

## 4. 배포 확인

브라우저에서 아래 주소를 직접 열어보세요:
```
https://<여러분의-프로젝트>.vercel.app/api/health
```
`{"status":"ok","hasGeminiKey":true, ...}` 가 보이면 정상입니다.

## 5. index.html에 새 주소 반영

`index.html`에서 다음 줄을 실제 Vercel 주소로 교체합니다:
```js
const WORKER_URL = "https://YOUR-PROJECT-NAME.vercel.app";
```

## 6. GitHub에 반영

수정된 `index.html`을 GitHub 저장소에 push하면 GitHub Pages가 자동 갱신됩니다.
(`worker/` 폴더의 기존 Cloudflare Worker 코드는 더 이상 사용하지 않으니 삭제하거나
참고용으로만 남겨두셔도 됩니다.)

## 나중에 키를 바꾸고 싶을 때

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables 에서
`GEMINI_API_KEY` 값을 수정한 뒤, **Deployments** 탭에서 최신 배포를 다시 배포(Redeploy)
하면 됩니다. 코드나 GitHub 저장소는 건드릴 필요 없습니다.
