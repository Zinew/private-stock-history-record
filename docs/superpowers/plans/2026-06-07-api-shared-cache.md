# API 서버 공유 캐시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloudflare Functions + KV를 공유 캐시 레이어로 두어, Alpha Vantage EARNINGS_CALENDAR / Finnhub company-news / Finnhub quote API 호출을 전체 사용자가 공유하도록 한다.

**Architecture:** 3개의 새 CF Function(`earnings-calendar`, `company-news`, `finnhub-quote`)이 외부 API를 대신 호출하고 Cloudflare KV에 캐시한다. 프론트엔드 `alphavantage.js`와 `finnhub.js`는 외부 API 대신 이 CF 엔드포인트를 호출한다. 브라우저 in-memory 캐시는 L1, KV는 L2 역할로 병존한다.

**Tech Stack:** Cloudflare Pages Functions, Cloudflare KV, Wrangler CLI, Vite, Vitest

---

## 파일 구조

| 파일 | 작업 |
|---|---|
| `wrangler.toml` | 신규 — Pages 설정 및 KV 바인딩 |
| `.dev.vars` | 신규 — 로컬 개발용 시크릿 (gitignore) |
| `functions/api/earnings-calendar.js` | 신규 — Alpha Vantage 프록시 + KV 6시간 캐시 |
| `functions/api/company-news.js` | 신규 — Finnhub news 프록시 + KV 1시간 캐시 |
| `functions/api/finnhub-quote.js` | 신규 — Finnhub quote 프록시 + KV 5분 캐시 |
| `src/utils/alphavantage.js` | 수정 — `/api/earnings-calendar` 호출, `_clearEarningsCache` 추가 |
| `src/__tests__/alphavantage.test.js` | 신규 — fetchEarningsCalendar 단위 테스트 |
| `src/utils/finnhub.js` | 수정 — `fetchQuote` / `fetchCompanyNews` CF 엔드포인트 호출, apiKey 파라미터 제거 |
| `src/__tests__/finnhub.test.js` | 수정 — fetchQuote / fetchCompanyNews 테스트 업데이트 |
| `package.json` | 수정 — `dev:pages` 스크립트 추가 |
| `.env.production` | 수정 — `VITE_ALPHAVANTAGE_KEY` 삭제 |
| `.gitignore` | 수정 — `.dev.vars` 추가 |

---

## Task 1: wrangler 설치 + 로컬 개발 설정

**Files:**
- Modify: `package.json`
- Create: `wrangler.toml`
- Create: `.dev.vars`
- Modify: `.gitignore`

- [ ] **Step 1: wrangler 설치**

```bash
npm install --save-dev wrangler
```

Expected: `package.json` devDependencies에 `wrangler` 추가됨.

- [ ] **Step 2: `package.json`에 dev:pages 스크립트 추가**

`scripts` 블록에 추가:
```json
"dev:pages": "wrangler pages dev --proxy 5173"
```

최종 scripts:
```json
"scripts": {
  "dev": "vite",
  "dev:pages": "wrangler pages dev --proxy 5173",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: `wrangler.toml` 생성**

```toml
name = "ledger"
pages_build_output_dir = "dist"
compatibility_date = "2024-09-23"

[[kv_namespaces]]
binding = "LEDGER_CACHE"
id = "00000000000000000000000000000001"
preview_id = "00000000000000000000000000000001"
```

> `id`는 Task 8에서 실제 KV 네임스페이스 ID로 교체한다. 로컬 개발 중에는 wrangler가 자체 로컬 KV를 사용하므로 placeholder라도 동작한다.

- [ ] **Step 4: `.dev.vars` 생성**

```
ALPHAVANTAGE_KEY=G0IOWX85Y86ECO2T
FINNHUB_KEY=d8h44n1r01qhjpmqh8u0d8h44n1r01qhjpmqh8ug
```

> `.dev.vars`는 `wrangler pages dev` 실행 시 Worker 환경변수로 주입된다. 브라우저에 노출되지 않는다.

- [ ] **Step 5: `.gitignore`에 `.dev.vars` 추가**

`.gitignore` 파일을 읽고 맨 끝에 추가:
```
.dev.vars
```

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json wrangler.toml .gitignore
git commit -m "feat: add wrangler setup for local Pages dev with KV"
```

> `.dev.vars`는 커밋하지 않는다 (gitignore됨).

---

## Task 2: CF Function — `earnings-calendar.js`

**Files:**
- Create: `functions/api/earnings-calendar.js`

- [ ] **Step 1: `functions/api/earnings-calendar.js` 생성**

```js
const CACHE_TTL = 6 * 60 * 60 // 21600초

export async function onRequestGet(context) {
  const kv = context.env.LEDGER_CACHE
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  const cached = await kv.get('earnings_calendar', { type: 'json' })
  if (cached) return new Response(JSON.stringify(cached), { headers })

  const apiKey = context.env.ALPHAVANTAGE_KEY
  if (!apiKey) return new Response('[]', { headers })

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${apiKey}`
    )
    const csv = await res.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2 || lines[1].startsWith('I,n,f')) return new Response('[]', { headers })

    const result = lines.slice(1)
      .map(line => {
        const parts = line.split(',')
        return {
          symbol: parts[0]?.trim(),
          reportDate: parts[2]?.trim(),
          estimate: parts[4] ? parseFloat(parts[4]) : null,
        }
      })
      .filter(e => e.symbol && e.reportDate)

    await kv.put('earnings_calendar', JSON.stringify(result), { expirationTtl: CACHE_TTL })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response('[]', { headers })
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add functions/api/earnings-calendar.js
git commit -m "feat: add earnings-calendar CF Function with KV cache"
```

---

## Task 3: CF Function — `company-news.js`

**Files:**
- Create: `functions/api/company-news.js`

- [ ] **Step 1: `functions/api/company-news.js` 생성**

```js
const CACHE_TTL = 60 * 60 // 3600초

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const symbol = url.searchParams.get('symbol') ?? ''
  const from   = url.searchParams.get('from') ?? ''
  const to     = url.searchParams.get('to') ?? ''
  const kv = context.env.LEDGER_CACHE
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (!symbol || !from || !to) return new Response('[]', { headers })

  const cacheKey = `company_news:${symbol}:${from}:${to}`
  const cached = await kv.get(cacheKey, { type: 'json' })
  if (cached) return new Response(JSON.stringify(cached), { headers })

  const apiKey = context.env.FINNHUB_KEY
  if (!apiKey) return new Response('[]', { headers })

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    const result = Array.isArray(data)
      ? data.slice(0, 10).map(item => ({
          title: item.headline,
          summary: item.summary || null,
          source: item.source,
          url: item.url,
          publishedAtUnix: item.datetime,
        }))
      : []

    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response('[]', { headers })
  }
}
```

> CF는 raw unix timestamp를 `publishedAtUnix`로 반환한다. `formatPublishedAt` 적용은 프론트엔드(`finnhub.js`)에서 한다.

- [ ] **Step 2: 커밋**

```bash
git add functions/api/company-news.js
git commit -m "feat: add company-news CF Function with KV cache"
```

---

## Task 4: CF Function — `finnhub-quote.js`

**Files:**
- Create: `functions/api/finnhub-quote.js`

- [ ] **Step 1: `functions/api/finnhub-quote.js` 생성**

```js
const CACHE_TTL = 5 * 60 // 300초

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const symbol = url.searchParams.get('symbol') ?? ''
  const kv = context.env.LEDGER_CACHE
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (!symbol) return new Response(JSON.stringify({ price: null }), { headers })

  const cacheKey = `quote:${symbol}`
  const cached = await kv.get(cacheKey, { type: 'json' })
  if (cached) return new Response(JSON.stringify(cached), { headers })

  const apiKey = context.env.FINNHUB_KEY
  if (!apiKey) return new Response(JSON.stringify({ price: null }), { headers })

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
    )
    const data = await res.json()
    const result = { price: data.c > 0 ? data.c : null }
    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response(JSON.stringify({ price: null }), { headers })
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add functions/api/finnhub-quote.js
git commit -m "feat: add finnhub-quote CF Function with KV cache"
```

---

## Task 5: wrangler 로컬 스모크 테스트

**Files:** 없음 (검증만)

- [ ] **Step 1: 터미널 1 — Vite 개발 서버 시작**

```bash
npm run dev
```

Expected: Vite가 http://localhost:5173 에서 실행됨.

- [ ] **Step 2: 터미널 2 — wrangler Pages 개발 서버 시작**

```bash
npm run dev:pages
```

Expected: wrangler가 http://localhost:8788 에서 실행됨. 아래와 같은 출력:
```
✨ Starting local server...
[wrangler:info] Ready on http://localhost:8788
```

- [ ] **Step 3: earnings-calendar 엔드포인트 스모크 테스트**

```bash
curl http://localhost:8788/api/earnings-calendar
```

Expected: `[]` 또는 JSON 배열 반환. (Alpha Vantage 키가 `.dev.vars`에 있어야 실제 데이터 반환. 빈 배열도 통과 — 에러 없이 응답하면 OK.)

- [ ] **Step 4: company-news 엔드포인트 스모크 테스트**

```bash
curl "http://localhost:8788/api/company-news?symbol=AAPL&from=2026-05-07&to=2026-06-07"
```

Expected: JSON 배열 반환 (각 항목에 `title`, `source`, `url`, `publishedAtUnix` 필드 포함).

- [ ] **Step 5: finnhub-quote 엔드포인트 스모크 테스트**

```bash
curl "http://localhost:8788/api/finnhub-quote?symbol=AAPL"
```

Expected: `{"price": 195.5}` 형태 (실제 숫자 또는 null).

- [ ] **Step 6: 누락 파라미터 에러 처리 확인**

```bash
curl "http://localhost:8788/api/company-news"
curl "http://localhost:8788/api/finnhub-quote"
```

Expected: 두 요청 모두 `[]` 또는 `{"price":null}` 반환 (500 에러 없음).

---

## Task 6: `alphavantage.js` 수정 + 테스트

**Files:**
- Modify: `src/utils/alphavantage.js`
- Create: `src/__tests__/alphavantage.test.js`

- [ ] **Step 1: 테스트 파일 먼저 작성**

`src/__tests__/alphavantage.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchEarningsCalendar, _clearEarningsCache } from '../utils/alphavantage.js'

beforeEach(() => _clearEarningsCache())
afterEach(() => vi.restoreAllMocks())

describe('fetchEarningsCalendar', () => {
  it('calls /api/earnings-calendar and returns parsed array', async () => {
    const fakeData = [{ symbol: 'AAPL', reportDate: '2026-07-30', estimate: 1.9 }]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(fakeData),
    })
    const result = await fetchEarningsCalendar()
    expect(result).toEqual(fakeData)
    expect(fetch).toHaveBeenCalledWith('/api/earnings-calendar')
  })

  it('returns cached result on second call without extra fetch', async () => {
    const fakeData = [{ symbol: 'AAPL', reportDate: '2026-07-30', estimate: 1.9 }]
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(fakeData),
    })
    await fetchEarningsCalendar()
    await fetchEarningsCalendar()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'rate limited' }),
    })
    expect(await fetchEarningsCalendar()).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchEarningsCalendar()).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npm test -- --run src/__tests__/alphavantage.test.js
```

Expected: FAIL — `_clearEarningsCache is not a function` 또는 `fetchEarningsCalendar` 동작 불일치.

- [ ] **Step 3: `src/utils/alphavantage.js` 교체**

```js
let _cache = null
let _cacheTime = 0
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export function _clearEarningsCache() { _cache = null; _cacheTime = 0 }

export async function fetchEarningsCalendar() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) return _cache
  try {
    const res = await fetch('/api/earnings-calendar')
    const data = await res.json()
    if (!Array.isArray(data)) return _cache ?? []
    _cache = data
    _cacheTime = Date.now()
    return data
  } catch {
    return _cache ?? []
  }
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npm test -- --run src/__tests__/alphavantage.test.js
```

Expected: 4/4 PASS.

- [ ] **Step 5: 전체 테스트 실행**

```bash
npm test -- --run
```

Expected: 기존 123개 + 새 4개 = 127개 전부 PASS.

> `useCalendarEvents.js`는 `fetchEarningsCalendar`를 import한다. 해당 훅의 테스트는 순수 함수만 테스트하므로 영향 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/utils/alphavantage.js src/__tests__/alphavantage.test.js
git commit -m "feat: fetch earnings calendar from CF endpoint instead of Alpha Vantage directly"
```

---

## Task 7: `finnhub.js` 수정 + 테스트 업데이트

**Files:**
- Modify: `src/utils/finnhub.js`
- Modify: `src/__tests__/finnhub.test.js`

- [ ] **Step 1: `finnhub.test.js`의 fetchQuote 테스트 교체**

`fetchQuote` describe 블록 전체를 아래로 교체:

```js
describe('fetchQuote', () => {
  it('returns price when CF endpoint succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ price: 195.5 }),
    })
    expect(await fetchQuote('AAPL')).toBe(195.5)
    expect(fetch).toHaveBeenCalledWith('/api/finnhub-quote?symbol=AAPL')
  })

  it('returns null when price is null', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ price: null }),
    })
    expect(await fetchQuote('INVALID')).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchQuote('AAPL')).toBeNull()
  })
})
```

> 제거: "returns null when apiKey is empty string" 케이스 — apiKey 파라미터 없어짐.

- [ ] **Step 2: `finnhub.test.js`의 fetchCompanyNews 테스트 교체**

`fetchCompanyNews` describe 블록 전체를 아래로 교체:

```js
describe('fetchCompanyNews', () => {
  it('maps CF response to article shape and slices to 10', async () => {
    const fakeItems = Array.from({ length: 12 }, (_, i) => ({
      title: `Title ${i}`,
      summary: `Summary ${i}`,
      source: 'Reuters',
      url: `https://example.com/${i}`,
      publishedAtUnix: Math.floor((Date.now() - i * 60 * 60 * 1000) / 1000),
    }))
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(fakeItems),
    })
    const result = await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')
    expect(result).toHaveLength(10)
    expect(result[0]).toMatchObject({ title: 'Title 0', source: 'Reuters', url: 'https://example.com/0' })
    expect(typeof result[0].publishedAt).toBe('string')
    expect(fetch).toHaveBeenCalledWith(
      '/api/company-news?symbol=AAPL&from=2026-05-07&to=2026-06-06'
    )
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'not found' }),
    })
    expect(await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')).toEqual([])
  })

  it('returns cached data on network error when cache exists', async () => {
    const oldUnix = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000)
    const fakeItems = [{ title: 'Old news', summary: null, source: 'Reuters', url: 'https://example.com/0', publishedAtUnix: oldUnix }]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ json: () => Promise.resolve(fakeItems) })
    await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')
    vi.useFakeTimers()
    let result
    try {
      vi.advanceTimersByTime(61 * 60 * 1000)
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
      result = await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')
    } finally {
      vi.useRealTimers()
    }
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Old news')
  })
})
```

> 제거: "returns empty array when apiKey is empty string" 케이스.

- [ ] **Step 3: 테스트 실행 — FAIL 확인**

```bash
npm test -- --run src/__tests__/finnhub.test.js
```

Expected: fetchQuote / fetchCompanyNews 관련 테스트 FAIL (아직 구현 안 바꿨으므로).

- [ ] **Step 4: `src/utils/finnhub.js`의 `fetchQuote` 교체**

기존:
```js
export async function fetchQuote(ticker, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) {
    console.warn('[Finnhub] VITE_FINNHUB_KEY not set — price fetch skipped')
    return null
  }
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`
    )
    const data = await res.json()
    return data.c > 0 ? data.c : null
  } catch {
    return null
  }
}
```

교체 후:
```js
export async function fetchQuote(ticker) {
  try {
    const res = await fetch(`/api/finnhub-quote?symbol=${encodeURIComponent(ticker)}`)
    const data = await res.json()
    return data.price ?? null
  } catch {
    return null
  }
}
```

- [ ] **Step 5: `src/utils/finnhub.js`의 `fetchCompanyNews` 교체**

기존:
```js
export async function fetchCompanyNews(ticker, from, to, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) return []
  const key = `${ticker}:${from}:${to}`
  if (_newsCache[key] && Date.now() - _newsCache[key].time < NEWS_CACHE_TTL) return _newsCache[key].data
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    const result = Array.isArray(data)
      ? data.slice(0, 10).map(item => ({
          title: item.headline,
          summary: item.summary || null,
          source: item.source,
          url: item.url,
          publishedAt: formatPublishedAt(item.datetime),
        }))
      : []
    _newsCache[key] = { data: result, time: Date.now() }
    return result
  } catch {
    return _newsCache[key]?.data ?? []
  }
}
```

교체 후:
```js
export async function fetchCompanyNews(ticker, from, to) {
  const key = `${ticker}:${from}:${to}`
  if (_newsCache[key] && Date.now() - _newsCache[key].time < NEWS_CACHE_TTL) return _newsCache[key].data
  try {
    const res = await fetch(
      `/api/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}`
    )
    const data = await res.json()
    const result = Array.isArray(data)
      ? data.map(item => ({
          title: item.title,
          summary: item.summary,
          source: item.source,
          url: item.url,
          publishedAt: formatPublishedAt(item.publishedAtUnix),
        }))
      : []
    _newsCache[key] = { data: result, time: Date.now() }
    return result
  } catch {
    return _newsCache[key]?.data ?? []
  }
}
```

- [ ] **Step 6: 테스트 실행 — PASS 확인**

```bash
npm test -- --run src/__tests__/finnhub.test.js
```

Expected: 전체 PASS. fetchEarnings / fetchDividends 테스트 영향 없음 (apiKey 파라미터 그대로 유지).

- [ ] **Step 7: 전체 테스트 실행**

```bash
npm test -- --run
```

Expected: 127개 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add src/utils/finnhub.js src/__tests__/finnhub.test.js
git commit -m "feat: fetch quote and company-news from CF endpoints instead of Finnhub directly"
```

---

## Task 8: KV 네임스페이스 생성 + CF 대시보드 설정 + cleanup + push

**Files:**
- Modify: `wrangler.toml`
- Modify: `.env.production`

- [ ] **Step 1: KV 네임스페이스 생성**

```bash
npx wrangler kv namespace create LEDGER_CACHE
```

Expected 출력:
```
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "LEDGER_CACHE", id = "abc123def456..." }
```

출력된 `id` 값을 복사해 둔다.

- [ ] **Step 2: `wrangler.toml`의 id 업데이트**

`wrangler.toml`에서 placeholder `id`를 방금 복사한 실제 ID로 교체:

```toml
[[kv_namespaces]]
binding = "LEDGER_CACHE"
id = "abc123def456..."       ← 실제 ID로 교체
preview_id = "abc123def456..." ← 동일 ID 사용 (또는 preview용 별도 생성)
```

- [ ] **Step 3: Cloudflare 대시보드 설정 (수동)**

Cloudflare 대시보드 (dash.cloudflare.com) 에서:

1. **Workers & Pages > ledger > Settings > Functions > KV namespace bindings**
   - `+ Add binding` 클릭
   - Variable name: `LEDGER_CACHE`
   - KV namespace: 방금 생성한 `LEDGER_CACHE` 선택
   - Save

2. **Workers & Pages > ledger > Settings > Environment variables**
   - Production 탭에서 `+ Add variable` 클릭 (2회):
     - `ALPHAVANTAGE_KEY` = `G0IOWX85Y86ECO2T`
     - `FINNHUB_KEY` = `d8h44n1r01qhjpmqh8u0d8h44n1r01qhjpmqh8ug`
   - **Encrypt** 체크 후 Save

- [ ] **Step 4: `.env.production`에서 `VITE_ALPHAVANTAGE_KEY` 삭제**

현재 `.env.production`:
```
VITE_ALPHAVANTAGE_KEY=G0IOWX85Y86ECO2T
VITE_FINNHUB_KEY=d8h44n1r01qhjpmqh8u0d8h44n1r01qhjpmqh8ug
```

변경 후 (VITE_ALPHAVANTAGE_KEY 삭제):
```
VITE_FINNHUB_KEY=d8h44n1r01qhjpmqh8u0d8h44n1r01qhjpmqh8ug
```

> `VITE_FINNHUB_KEY`는 `fetchEarnings` / `fetchDividends`가 아직 직접 호출하므로 유지.

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

Expected: 오류 없이 빌드 완료. `dist/` 생성됨.

- [ ] **Step 6: 전체 테스트 최종 확인**

```bash
npm test -- --run
```

Expected: 127개 전부 PASS.

- [ ] **Step 7: 커밋 + push**

```bash
git add wrangler.toml .env.production
git commit -m "feat: configure KV namespace and remove VITE_ALPHAVANTAGE_KEY from production"
git push
```

Expected: Cloudflare Pages가 자동 배포 시작. 배포 완료 후 실제 서비스에서:
- http://yourdomain.pages.dev/api/earnings-calendar → JSON 응답
- http://yourdomain.pages.dev/api/company-news?symbol=AAPL&from=2026-05-07&to=2026-06-07 → JSON 응답
- http://yourdomain.pages.dev/api/finnhub-quote?symbol=AAPL → `{"price": ...}`
