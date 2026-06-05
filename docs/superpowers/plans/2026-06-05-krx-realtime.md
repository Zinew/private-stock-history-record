# KRX 실시간 주가 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KRW 종목 추가 시 이름 검색으로 종목을 선택하고, Yahoo Finance API(Cloudflare Worker 프록시)를 통해 현재가를 자동 조회한다.

**Architecture:** Cloudflare Pages Functions(`functions/api/`)가 Yahoo Finance CORS 프록시 역할을 하고, 새 `useKrxPrices` 훅이 KRW 종목 가격을 배치 조회한다. HoldingsTable의 KRW 이름 필드는 debounce 검색 + 드롭다운 선택 UI로 변환되며, App.jsx에서 USD/KRX 가격을 합산한다.

**Tech Stack:** Cloudflare Pages Functions, Yahoo Finance API (비공식), React (useState/useRef/useMemo), Vitest

---

### Task 1: Cloudflare Pages Functions

**Files:**
- Create: `functions/api/krx-search.js`
- Create: `functions/api/krx-quote.js`

> Cloudflare Functions는 브라우저 단위 테스트가 어려우므로 배포 후 curl로 검증한다 (Task 7).

- [ ] **Step 1: krx-search.js 생성**

`functions/api/krx-search.js`:

```js
export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const q = url.searchParams.get('q') ?? ''
  if (!q.trim()) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=ko-KR&region=KR`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const quotes = (data.quotes ?? [])
      .filter(item => item.symbol && (item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ')))
      .slice(0, 8)
      .map(item => ({
        symbol: item.symbol,
        name: item.shortname ?? item.longname ?? item.symbol,
        ticker: item.symbol.replace(/\.(KS|KQ)$/, ''),
        exchange: item.symbol.endsWith('.KS') ? 'KS' : 'KQ',
      }))
    return new Response(JSON.stringify(quotes), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
```

- [ ] **Step 2: krx-quote.js 생성**

`functions/api/krx-quote.js`:

```js
export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const symbol = url.searchParams.get('symbol') ?? ''
  if (!symbol) {
    return new Response(JSON.stringify({ price: null }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
    return new Response(JSON.stringify({ price: price != null && price > 0 ? price : null }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch {
    return new Response(JSON.stringify({ price: null }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add functions/api/krx-search.js functions/api/krx-quote.js
git commit -m "feat: add Cloudflare Functions for KRX search and quote proxy"
```

---

### Task 2: src/utils/krx.js (TDD)

**Files:**
- Create: `src/utils/krx.js`
- Create: `src/__tests__/krx.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/krx.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchKrxSearch, fetchKrxQuote } from '../utils/krx.js'

describe('fetchKrxSearch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('빈 문자열 → 빈 배열 반환 (fetch 미호출)', async () => {
    const spy = vi.stubGlobal('fetch', vi.fn())
    expect(await fetchKrxSearch('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
    spy.restore?.()
  })

  it('null → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchKrxSearch(null)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('정상 응답 → 결과 배열 반환', async () => {
    const mockResults = [{ symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    }))
    const result = await fetchKrxSearch('삼성')
    expect(result).toEqual(mockResults)
    expect(fetch).toHaveBeenCalledWith('/api/krx-search?q=%EC%82%BC%EC%84%B1')
  })

  it('fetch 실패 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await fetchKrxSearch('삼성')).toEqual([])
  })

  it('응답 not ok 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchKrxSearch('삼성')).toEqual([])
  })
})

describe('fetchKrxQuote', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('정상 응답 → price 반환, symbol 포맷 확인', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ price: 329000 }),
    }))
    expect(await fetchKrxQuote('005930', 'KS')).toBe(329000)
    expect(fetch).toHaveBeenCalledWith('/api/krx-quote?symbol=005930.KS')
  })

  it('price null 응답 → null 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ price: null }),
    }))
    expect(await fetchKrxQuote('005930', 'KS')).toBeNull()
  })

  it('fetch 실패 시 null 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await fetchKrxQuote('005930', 'KS')).toBeNull()
  })

  it('응답 not ok → null 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchKrxQuote('005930', 'KS')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run src/__tests__/krx.test.js
```

Expected: `Cannot find module '../utils/krx.js'`

- [ ] **Step 3: krx.js 구현**

`src/utils/krx.js`:

```js
export async function fetchKrxSearch(query) {
  if (!query?.trim()) return []
  try {
    const res = await fetch(`/api/krx-search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function fetchKrxQuote(ticker, exchange) {
  try {
    const res = await fetch(`/api/krx-quote?symbol=${encodeURIComponent(ticker + '.' + exchange)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.price ?? null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
npx vitest run src/__tests__/krx.test.js
```

Expected: 9개 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/krx.js src/__tests__/krx.test.js
git commit -m "feat: add fetchKrxSearch and fetchKrxQuote utilities"
```

---

### Task 3: src/hooks/useKrxPrices.js (TDD)

**Files:**
- Create: `src/hooks/useKrxPrices.js`
- Create: `src/__tests__/hooks/useKrxPrices.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/hooks/useKrxPrices.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useKrxPrices } from '../../hooks/useKrxPrices.js'
import { fetchKrxQuote } from '../../utils/krx.js'

vi.mock('../../utils/krx.js', () => ({
  fetchKrxQuote: vi.fn(),
  fetchKrxSearch: vi.fn(),
}))

describe('useKrxPrices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('빈 목록 → fetchKrxQuote 미호출', async () => {
    const { result } = renderHook(() => useKrxPrices([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchKrxQuote).not.toHaveBeenCalled()
    expect(result.current.prices).toEqual({})
  })

  it('KRW 종목 조회 → prices 맵 반환', async () => {
    fetchKrxQuote.mockResolvedValueOnce(329000)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices['005930']).toBe(329000)
    expect(fetchKrxQuote).toHaveBeenCalledWith('005930', 'KS')
  })

  it('전체 조회 실패 시 error 설정', async () => {
    fetchKrxQuote.mockResolvedValueOnce(null)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })

  it('성공 시 lastUpdatedAt은 Date 인스턴스', async () => {
    fetchKrxQuote.mockResolvedValueOnce(329000)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date)
  })

  it('refresh 호출 시 재조회', async () => {
    fetchKrxQuote.mockResolvedValue(329000)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    fetchKrxQuote.mockResolvedValue(335000)
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices['005930']).toBe(335000)
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run src/__tests__/hooks/useKrxPrices.test.js
```

Expected: `Cannot find module '../../hooks/useKrxPrices.js'`

- [ ] **Step 3: useKrxPrices.js 구현**

`src/hooks/useKrxPrices.js`:

```js
import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchKrxQuote } from '../utils/krx.js'

export function useKrxPrices(krwHoldings) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const holdingsRef = useRef(krwHoldings)
  const prevHoldingsRef = useRef([])
  const hasFetchedRef = useRef(false)

  useEffect(() => { holdingsRef.current = krwHoldings }, [krwHoldings])

  const fetchAll = useCallback(() => {
    const list = holdingsRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const result = {}
        for (const { t, exchange } of list) {
          const price = await fetchKrxQuote(t, exchange)
          if (price !== null) result[t] = price
        }
        if (Object.keys(result).length === 0) {
          setError('KRX 주가 조회에 실패했습니다')
        } else {
          setPrices(prev => ({ ...prev, ...result }))
          setLastUpdatedAt(new Date())
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      prevHoldingsRef.current = krwHoldings
      fetchAll()
      return
    }
    const prevTickers = prevHoldingsRef.current.map(h => h.t)
    const hasNew = krwHoldings.some(h => !prevTickers.includes(h.t))
    prevHoldingsRef.current = krwHoldings
    if (hasNew) fetchAll()
  }, [krwHoldings, fetchAll])

  return { prices, loading, error, lastUpdatedAt, refresh: fetchAll }
}
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
npx vitest run src/__tests__/hooks/useKrxPrices.test.js
```

Expected: 5개 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useKrxPrices.js src/__tests__/hooks/useKrxPrices.test.js
git commit -m "feat: add useKrxPrices hook for KRX batch price fetching"
```

---

### Task 4: CSS 드롭다운 스타일

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: index.css 맨 아래에 드롭다운 스타일 추가**

```css
/* KRX search dropdown */
.krw-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
}
.krw-dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.krw-dropdown-item:hover { background: rgba(127,209,174,.08) }
.krw-item-name { font-size: 13px; color: var(--ink); }
.krw-item-meta {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  color: var(--ink-faint);
  white-space: nowrap;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.css
git commit -m "feat: add KRX search dropdown styles"
```

---

### Task 5: HoldingsTable KRW 검색 UX (TDD)

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/__tests__/components/HoldingsTable.test.jsx` 상단 import에 추가:

```js
import { fetchKrxSearch, fetchKrxQuote } from '../../utils/krx.js'
```

mock 블록에 추가 (기존 `vi.mock('../../utils/finnhub.js', ...)` 아래):

```js
vi.mock('../../utils/krx.js', () => ({
  fetchKrxSearch: vi.fn(),
  fetchKrxQuote: vi.fn(),
}))
```

`describe` 블록 맨 아래에 테스트 3개 추가:

```js
it('KRW 선택 후 이름 입력 시 fetchKrxSearch 호출', async () => {
  fetchKrxSearch.mockResolvedValue([
    { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
  ])
  render(<HoldingsTable {...defaultProps} />)
  fireEvent.click(screen.getByText('KRW'))
  fireEvent.change(screen.getByPlaceholderText('삼성전자'), { target: { value: '삼성' } })
  await waitFor(() => expect(fetchKrxSearch).toHaveBeenCalledWith('삼성'), { timeout: 500 })
})

it('드롭다운 항목 클릭 시 티커·이름·거래소 자동 입력', async () => {
  fetchKrxSearch.mockResolvedValue([
    { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
  ])
  fetchKrxQuote.mockResolvedValue(329000)
  render(<HoldingsTable {...defaultProps} />)
  fireEvent.click(screen.getByText('KRW'))
  fireEvent.change(screen.getByPlaceholderText('삼성전자'), { target: { value: '삼성' } })
  await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
  fireEvent.click(screen.getByText('삼성전자'))
  await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('005930'))
})

it('KRW 종목 선택 후 추가 시 onAdd에 exchange 포함', async () => {
  fetchKrxSearch.mockResolvedValue([
    { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
  ])
  fetchKrxQuote.mockResolvedValue(329000)
  const onAdd = vi.fn()
  render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
  fireEvent.click(screen.getByText('KRW'))
  fireEvent.change(screen.getByPlaceholderText('삼성전자'), { target: { value: '삼성' } })
  await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
  fireEvent.click(screen.getByText('삼성전자'))
  await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('005930'))
  fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
  fireEvent.change(screen.getByPlaceholderText('75000'), { target: { value: '75000' } })
  fireEvent.click(screen.getByText('+ 추가'))
  expect(onAdd).toHaveBeenCalledWith({
    t: '005930', nm: '삼성전자', q: 5, b: 75000, c: 329000, currency: 'KRW', exchange: 'KS',
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run src/__tests__/components/HoldingsTable.test.jsx
```

Expected: 신규 3개 FAIL

- [ ] **Step 3: HoldingsTable.jsx 수정**

**3-1. import 추가** (파일 상단):

```js
import { useRef } from 'react'
import { fetchKrxSearch, fetchKrxQuote } from '../utils/krx.js'
```

기존 `import { useState } from 'react'`를 아래로 교체:

```js
import { useState, useRef } from 'react'
```

**3-2. form 상태에 exchange 추가** (9번 줄):

```js
const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
```

**3-3. 새 state/ref 추가** (tickerStatus 선언 다음):

```js
const [krwSearchResults, setKrwSearchResults] = useState([])
const [krwSearchOpen, setKrwSearchOpen] = useState(false)
const debounceRef = useRef(null)
```

**3-4. handleKrwNameChange 함수 추가** (handleTickerBlur 함수 다음):

```js
function handleKrwNameChange(e) {
  const val = e.target.value
  setForm(f => ({ ...f, name: val, ticker: '', exchange: '', cur: '' }))
  clearTimeout(debounceRef.current)
  if (!val.trim()) { setKrwSearchResults([]); setKrwSearchOpen(false); return }
  debounceRef.current = setTimeout(async () => {
    const results = await fetchKrxSearch(val)
    setKrwSearchResults(results)
    setKrwSearchOpen(results.length > 0)
  }, 300)
}

async function handleKrwSelect(item) {
  setKrwSearchOpen(false)
  setKrwSearchResults([])
  setForm(f => ({ ...f, name: item.name, ticker: item.ticker, exchange: item.exchange, cur: '' }))
  const price = await fetchKrxQuote(item.ticker, item.exchange)
  if (price !== null) setForm(f => ({ ...f, cur: String(price) }))
}
```

**3-5. handleAdd에 exchange 포함** (기존 handleAdd 함수 교체):

```js
function handleAdd() {
  const t = form.ticker.trim().toUpperCase()
  const nm = form.name.trim()
  const q = parseFloat(form.qty)
  const b = parseFloat(form.buy)
  const c = parseFloat(form.cur)
  if (!t || !(q > 0) || !(b >= 0) || !(c >= 0)) {
    alert('티커·수량·매수가·현재가를 올바르게 입력해 주세요.')
    return
  }
  const holding = { t, nm, q, b, c, currency: form.currency }
  if (form.currency === 'KRW' && form.exchange) holding.exchange = form.exchange
  onAdd(holding)
  setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: form.currency, exchange: '' })
  setTickerStatus('idle')
  setKrwSearchResults([])
  setKrwSearchOpen(false)
}
```

**3-6. 통화 버튼 onClick 업데이트** (USD 버튼):

```jsx
onClick={() => { setForm(f => ({ ...f, currency: 'USD', exchange: '' })); setTickerStatus('idle'); setKrwSearchOpen(false) }}
```

KRW 버튼:

```jsx
onClick={() => { setForm(f => ({ ...f, currency: 'KRW', exchange: '' })); setTickerStatus('idle'); setKrwSearchOpen(false) }}
```

**3-7. 이름 필드를 검색 UI로 교체** (기존 `<div className="field nm">` 전체 교체):

```jsx
<div className="field nm" style={{ position: 'relative' }}>
  <label>{isKRW ? '이름 검색' : '이름(선택)'}</label>
  <input
    placeholder={isKRW ? '삼성전자' : 'Apple Inc.'}
    value={form.name}
    autoComplete="off"
    onChange={isKRW ? handleKrwNameChange : e => setForm(f => ({ ...f, name: e.target.value }))}
  />
  {isKRW && krwSearchOpen && krwSearchResults.length > 0 && (
    <div className="krw-dropdown">
      {krwSearchResults.map(item => (
        <div key={item.symbol} className="krw-dropdown-item" onClick={() => handleKrwSelect(item)}>
          <span className="krw-item-name">{item.name}</span>
          <span className="krw-item-meta">{item.ticker} · {item.exchange === 'KS' ? 'KOSPI' : 'KOSDAQ'}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

**3-8. 티커 필드: KRW 선택 완료 시 readOnly** (기존 티커 input 교체):

```jsx
<input
  placeholder="AAPL"
  value={form.ticker}
  readOnly={isKRW && !!form.exchange}
  style={isKRW && form.exchange ? { opacity: 0.6 } : {}}
  onChange={e => {
    if (isKRW && form.exchange) return
    setForm(f => ({ ...f, ticker: e.target.value }))
    if (tickerStatus !== 'idle') setTickerStatus('idle')
  }}
  onBlur={handleTickerBlur}
/>
```

**3-9. hasUsdHoldings → hasAutoHoldings** (13번 줄 근처):

```js
const hasAutoHoldings = holdings.some(h =>
  (h.currency ?? 'USD') === 'USD' || (h.currency === 'KRW' && h.exchange)
)
```

JSX에서 `{hasUsdHoldings && (` → `{hasAutoHoldings && (` 로 교체 (2곳)

**3-10. isLive 조건 변경** (각 행의 isLive 계산):

```js
const isLive = prices[h.t] !== undefined
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
npx vitest run src/__tests__/components/HoldingsTable.test.jsx
```

Expected: 전체 PASS (기존 12 + 신규 3 = 15개)

- [ ] **Step 5: 전체 테스트 확인**

```bash
npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/HoldingsTable.jsx src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: add KRW stock search typeahead to HoldingsTable"
```

---

### Task 6: App.jsx 통합

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: useKrxPrices import 추가**

파일 상단 import 블록에 추가:

```js
import { useKrxPrices } from './hooks/useKrxPrices.js'
```

- [ ] **Step 2: USD 훅 변수명 변경 및 KRX 훅 추가**

기존:
```js
const { prices, loading: priceLoading, error: priceError, lastUpdatedAt, refresh } = useStockPrices(usdTickers)
```

교체:
```js
const { prices: usdPrices, loading: usdLoading, error: usdError, lastUpdatedAt: usdUpdatedAt, refresh: refreshUsd } = useStockPrices(usdTickers)

const krwHoldings = useMemo(
  () => holdings.filter(h => h.currency === 'KRW' && h.exchange).map(h => ({ t: h.t, exchange: h.exchange })),
  [holdings]
)
const { prices: krwPrices, loading: krwLoading, error: krwError, refresh: refreshKrw } = useKrxPrices(krwHoldings)

const prices = useMemo(() => ({ ...usdPrices, ...krwPrices }), [usdPrices, krwPrices])
const priceLoading = usdLoading || krwLoading
const priceError = usdError || krwError || null
const lastUpdatedAt = usdUpdatedAt
```

- [ ] **Step 3: effectiveHoldings 조건 단순화**

기존:
```js
const effectiveHoldings = holdings.map(h => ({
  ...h,
  c: h.currency === 'USD' ? (prices[h.t] ?? h.c) : h.c,
}))
```

교체:
```js
const effectiveHoldings = holdings.map(h => ({
  ...h,
  c: prices[h.t] !== undefined ? prices[h.t] : h.c,
}))
```

- [ ] **Step 4: refresh 함수 통합**

기존 `onRefresh={refresh}` 대신:

```jsx
onRefresh={() => { refreshUsd(); refreshKrw() }}
```

- [ ] **Step 5: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/App.jsx
git commit -m "feat: integrate useKrxPrices into App, merge USD and KRX prices"
```

---

### Task 7: 배포 및 브라우저 검증

- [ ] **Step 1: 원격 push (Cloudflare Pages 자동 배포 트리거)**

```bash
git push origin main
```

- [ ] **Step 2: 배포 완료 후 Functions 동작 확인**

배포된 URL에서 curl로 확인 (URL은 Cloudflare Pages 대시보드 참조):

```bash
curl "https://<your-pages-url>/api/krx-search?q=삼성전자"
# Expected: [{"symbol":"005930.KS","name":"삼성전자","ticker":"005930","exchange":"KS"}, ...]

curl "https://<your-pages-url>/api/krx-quote?symbol=005930.KS"
# Expected: {"price":329000}
```

- [ ] **Step 3: 브라우저 기능 검증**

배포된 앱에서:

- KRW 선택 → 이름 필드 placeholder가 "삼성전자"로 변경
- "삼성" 입력 → 300ms 후 드롭다운 표시 (종목명·티커·거래소)
- 종목 선택 → 티커 자동 입력, 현재가 자동 조회
- 수량·매수가 입력 후 추가 → 테이블에 종목 추가, `●` live 인디케이터 표시
- ↻ 버튼 → KRW 종목도 가격 재조회
- 기존 USD 종목 동작 변화 없음 확인
