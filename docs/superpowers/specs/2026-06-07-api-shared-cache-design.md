# API 서버 공유 캐시 설계

## 개요

현재 브라우저가 Alpha Vantage / Finnhub API를 직접 호출하므로 사용자마다 각자 호출 횟수를 소진한다. Cloudflare Functions + KV를 서버 측 공유 캐시 레이어로 두어, 전체 사용자가 하나의 캐시를 공유하도록 한다. API 키도 브라우저 노출에서 서버 전용으로 이동한다.

---

## 범위

| API | 현재 TTL | 변경 후 TTL | 비고 |
|---|---|---|---|
| Alpha Vantage EARNINGS_CALENDAR | 브라우저 in-memory 6hr | KV 6hr | 전 종목 단일 키 |
| Finnhub company-news | 브라우저 in-memory 1hr | KV 1hr | 종목+날짜 복합 키 |
| Finnhub quote | 캐시 없음 | KV 5min | 종목 단일 키 |

**범위 외:** `fetchEarnings` (Finnhub 종목별 실적 캘린더), `fetchDividends` — `VITE_FINNHUB_KEY` 계속 사용, 별도 작업.

---

## 아키텍처

```
[브라우저]
  │
  ├─ /api/earnings-calendar        ─► [CF Function] ─► KV hit → return
  │                                                    KV miss → Alpha Vantage → KV put → return
  │
  ├─ /api/company-news?symbol=AAPL ─► [CF Function] ─► KV hit → return
  │                                                    KV miss → Finnhub → KV put → return
  │
  └─ /api/finnhub-quote?symbol=AAPL ─► [CF Function] ─► KV hit → return
                                                         KV miss → Finnhub → KV put → return
```

브라우저 in-memory 캐시는 L1(세션 내 네트워크 절약), KV는 L2(전체 사용자 공유) 역할로 계속 병존한다.

---

## 파일 구조

| 파일 | 작업 | 역할 |
|---|---|---|
| `functions/api/earnings-calendar.js` | 신규 | Alpha Vantage 프록시 + KV 캐시 |
| `functions/api/company-news.js` | 신규 | Finnhub company-news 프록시 + KV 캐시 |
| `functions/api/finnhub-quote.js` | 신규 | Finnhub quote 프록시 + KV 캐시 |
| `wrangler.toml` | 신규 | Pages 설정, KV 바인딩 |
| `.dev.vars` | 신규 | 로컬 개발용 시크릿 (gitignore) |
| `package.json` | 수정 | `dev:pages` 스크립트 추가 |
| `src/utils/alphavantage.js` | 수정 | `/api/earnings-calendar` 호출로 교체 |
| `src/utils/finnhub.js` | 수정 | `fetchQuote` / `fetchCompanyNews` CF 엔드포인트 호출 |
| `.env.production` | 수정 | `VITE_ALPHAVANTAGE_KEY` 삭제 (나머지 유지) |

---

## KV 캐시 키 설계

| KV 키 | TTL | 데이터 |
|---|---|---|
| `earnings_calendar` | 21600초 (6시간) | Alpha Vantage CSV → JSON 파싱 결과 배열 |
| `company_news:{ticker}:{from}:{to}` | 3600초 (1시간) | Finnhub news 배열 (최대 10건) |
| `quote:{ticker}` | 300초 (5분) | `{ price: number \| null }` |

---

## CF Function 구현 패턴

### `earnings-calendar.js`

```js
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
        return { symbol: parts[0]?.trim(), reportDate: parts[2]?.trim(), estimate: parts[4] ? parseFloat(parts[4]) : null }
      })
      .filter(e => e.symbol && e.reportDate)

    await kv.put('earnings_calendar', JSON.stringify(result), { expirationTtl: 21600 })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response('[]', { headers })
  }
}
```

### `company-news.js`

```js
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

    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response('[]', { headers })
  }
}
```

> **참고:** `publishedAt` 포맷팅(`formatPublishedAt`)은 CF Worker에서 하지 않고 프론트엔드에서 처리한다. CF는 원시 unix timestamp(`publishedAtUnix`)를 그대로 반환한다.

### `finnhub-quote.js`

```js
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
    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response(JSON.stringify({ price: null }), { headers })
  }
}
```

---

## 프론트엔드 변경

### `src/utils/alphavantage.js`

`apiKey` 파라미터 제거, fetch 대상을 `/api/earnings-calendar`로 교체. in-memory 캐시는 L1으로 유지.

```js
let _cache = null
let _cacheTime = 0
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

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

### `src/utils/finnhub.js`

`fetchQuote`: `/api/finnhub-quote?symbol=…` 호출로 교체.

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

`fetchCompanyNews`: `/api/company-news?symbol=…&from=…&to=…` 호출로 교체. CF가 `publishedAtUnix`를 반환하므로 프론트엔드에서 `formatPublishedAt` 적용.

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

---

## wrangler 설정

### `wrangler.toml`

```toml
name = "ledger"
pages_build_output_dir = "dist"
compatibility_date = "2024-09-23"

[[kv_namespaces]]
binding = "LEDGER_CACHE"
id = "PRODUCTION_KV_NAMESPACE_ID"      # wrangler kv namespace create 후 채움
preview_id = "PREVIEW_KV_NAMESPACE_ID" # 선택적
```

### `.dev.vars` (gitignore에 추가)

```
ALPHAVANTAGE_KEY=G0IOWX85Y86ECO2T
FINNHUB_KEY=d8h44n1r01qhjpmqh8u0d8h44n1r01qhjpmqh8ug
```

### `package.json` 스크립트 추가

```json
"dev:pages": "wrangler pages dev --proxy 5173"
```

### 로컬 개발 워크플로우

```bash
# 터미널 1
npm run dev          # Vite → http://localhost:5173

# 터미널 2
npm run dev:pages    # wrangler Pages → http://localhost:8788 (여기서 접속)
```

http://localhost:8788 에서 접속하면 `/api/*`는 CF Functions, 나머지는 Vite 개발 서버로 라우팅된다.

---

## Cloudflare 대시보드 작업

구현 전 수동으로 한 번만 필요:

1. **KV 네임스페이스 생성**
   ```bash
   npx wrangler kv namespace create LEDGER_CACHE
   ```
   출력된 `id`를 `wrangler.toml`의 `id` 필드에 기입.

2. **CF Pages 환경변수 등록** (대시보드 → Pages > ledger > Settings > Environment variables)
   - `ALPHAVANTAGE_KEY` = (Alpha Vantage 키)
   - `FINNHUB_KEY` = (Finnhub 키)
   - `LEDGER_CACHE` KV binding 연결

3. **`.env.production` 수정**
   - `VITE_ALPHAVANTAGE_KEY` 삭제 (브라우저 노출 불필요)
   - `VITE_FINNHUB_KEY` 유지 (fetchEarnings / fetchDividends 아직 직접 호출)

---

## 에러 처리

- KV 읽기 실패 → API 직접 호출 (fallback)
- API 호출 실패 → 빈 배열 / null 반환 (기존 동작 유지)
- KV 쓰기 실패 → 응답은 정상 반환, 다음 요청에서 재시도

---

## 테스트 전략

- `fetchEarningsCalendar` 유닛 테스트: `/api/earnings-calendar`를 `vi.spyOn(global, 'fetch')`으로 모킹
- `fetchQuote` / `fetchCompanyNews` 유닛 테스트: 동일하게 fetch 모킹, CF 엔드포인트 URL 검증
- CF Functions 자체 테스트: wrangler 로컬 환경에서 `curl` 스모크 테스트

---

## 범위 외

- `fetchEarnings` / `fetchDividends` CF 이전 (2단계)
- KV 캐시 강제 무효화 엔드포인트
- 캐시 히트율 모니터링
