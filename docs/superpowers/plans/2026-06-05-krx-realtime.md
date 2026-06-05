# KRX 실시간 주가 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** USD/KRW 모든 종목 추가 시 이름 검색으로 종목을 선택하고, 선택된 종목의 현재가를 자동 조회한다. KRW는 Yahoo Finance(Cloudflare Worker 프록시), USD는 기존 Finnhub 방식을 유지한다.

**Architecture:** Cloudflare Pages Functions(`functions/api/`)가 Yahoo Finance CORS 프록시 역할을 하고, 새 `useKrxPrices` 훅이 KRW 종목 가격을 배치 조회한다. HoldingsTable의 이름 필드가 USD/KRW 모두 debounce 검색 + 드롭다운 선택 UI로 변환되며, App.jsx에서 USD/KRX 가격을 합산한다.

**Tech Stack:** Cloudflare Pages Functions, Yahoo Finance API (비공식), Finnhub API, React (useState/useRef/useMemo), Vitest

---

### Task 1: Cloudflare Pages Functions

**Files:**
- Create: `functions/api/usd-search.js`
- Create: `functions/api/krx-search.js`
- Create: `functions/api/krx-quote.js`

> Cloudflare Functions는 브라우저 단위 테스트가 어려우므로 배포 후 curl로 검증한다 (Task 7).

- [ ] **Step 1: usd-search.js 생성**

`functions/api/usd-search.js`:

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
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=US`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const quotes = (data.quotes ?? [])
      .filter(item =>
        item.symbol &&
        item.quoteType === 'EQUITY' &&
        !item.symbol.endsWith('.KS') &&
        !item.symbol.endsWith('.KQ') &&
        !item.symbol.includes('.')
      )
      .slice(0, 8)
      .map(item => ({
        symbol: item.symbol,
        name: item.shortname ?? item.longname ?? item.symbol,
        ticker: item.symbol,
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

- [ ] **Step 2: krx-search.js 생성**

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

- [ ] **Step 3: krx-quote.js 생성**

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

- [ ] **Step 4: 커밋**

```bash
git add functions/api/usd-search.js functions/api/krx-search.js functions/api/krx-quote.js
git commit -m "feat: add Cloudflare Functions for USD/KRX search and KRX quote proxy"
```

---

### Task 2: src/utils/stockSearch.js (TDD)

**Files:**
- Create: `src/utils/stockSearch.js`
- Create: `src/__tests__/stockSearch.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/stockSearch.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../utils/stockSearch.js'

describe('fetchUsdSearch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('빈 문자열 → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchUsdSearch('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('null → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchUsdSearch(null)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('정상 응답 → 결과 배열 반환', async () => {
    const mockResults = [{ symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    }))
    const result = await fetchUsdSearch('apple')
    expect(result).toEqual(mockResults)
    expect(fetch).toHaveBeenCalledWith('/api/usd-search?q=apple')
  })

  it('fetch 실패 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await fetchUsdSearch('apple')).toEqual([])
  })

  it('응답 not ok 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchUsdSearch('apple')).toEqual([])
  })
})

describe('fetchKrxSearch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('빈 문자열 → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchKrxSearch('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
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
npx vitest run src/__tests__/stockSearch.test.js
```

Expected: `Cannot find module '../utils/stockSearch.js'`

- [ ] **Step 3: stockSearch.js 구현**

`src/utils/stockSearch.js`:

```js
export async function fetchUsdSearch(query) {
  if (!query?.trim()) return []
  try {
    const res = await fetch(`/api/usd-search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

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
npx vitest run src/__tests__/stockSearch.test.js
```

Expected: 14개 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/stockSearch.js src/__tests__/stockSearch.test.js
git commit -m "feat: add fetchUsdSearch, fetchKrxSearch, fetchKrxQuote utilities"
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
import { fetchKrxQuote } from '../../utils/stockSearch.js'

vi.mock('../../utils/stockSearch.js', () => ({
  fetchKrxQuote: vi.fn(),
  fetchKrxSearch: vi.fn(),
  fetchUsdSearch: vi.fn(),
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
import { fetchKrxQuote } from '../utils/stockSearch.js'

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
/* stock search dropdown (USD + KRW 공용) */
.search-dropdown {
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
.search-dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.search-dropdown-item:hover { background: rgba(127,209,174,.08) }
.search-item-name { font-size: 13px; color: var(--ink); }
.search-item-meta {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  color: var(--ink-faint);
  white-space: nowrap;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.css
git commit -m "feat: add stock search dropdown styles"
```

---

### Task 5: HoldingsTable 이름 검색 UX (TDD)

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/__tests__/components/HoldingsTable.test.jsx` 상단 import에 추가:

```js
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../../utils/stockSearch.js'
```

mock 블록에 추가 (기존 `vi.mock('../../utils/finnhub.js', ...)` 아래):

```js
vi.mock('../../utils/stockSearch.js', () => ({
  fetchUsdSearch: vi.fn(),
  fetchKrxSearch: vi.fn(),
  fetchKrxQuote: vi.fn(),
}))
```

`describe` 블록 맨 아래에 테스트 6개 추가:

```js
// USD 이름 검색
it('USD: 이름 입력 시 fetchUsdSearch 호출', async () => {
  fetchUsdSearch.mockResolvedValue([
    { symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' },
  ])
  render(<HoldingsTable {...defaultProps} />)
  fireEvent.change(screen.getByPlaceholderText('Apple Inc.'), { target: { value: 'apple' } })
  await waitFor(() => expect(fetchUsdSearch).toHaveBeenCalledWith('apple'), { timeout: 500 })
})

it('USD: 드롭다운 선택 시 티커·이름 자동 입력', async () => {
  fetchUsdSearch.mockResolvedValue([
    { symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' },
  ])
  const { fetchQuote } = await import('../../utils/finnhub.js')
  fetchQuote.mockResolvedValue(195.5)
  render(<HoldingsTable {...defaultProps} />)
  fireEvent.change(screen.getByPlaceholderText('Apple Inc.'), { target: { value: 'apple' } })
  await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Apple Inc.'))
  await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('AAPL'))
})

it('USD: 종목 선택 후 추가 시 onAdd에 올바른 값 전달', async () => {
  fetchUsdSearch.mockResolvedValue([
    { symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' },
  ])
  const { fetchQuote } = await import('../../utils/finnhub.js')
  fetchQuote.mockResolvedValue(195.5)
  const onAdd = vi.fn()
  render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
  fireEvent.change(screen.getByPlaceholderText('Apple Inc.'), { target: { value: 'apple' } })
  await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Apple Inc.'))
  await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('AAPL'))
  fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '3' } })
  fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '180' } })
  fireEvent.click(screen.getByText('+ 추가'))
  expect(onAdd).toHaveBeenCalledWith({ t: 'AAPL', nm: 'Apple Inc.', q: 3, b: 180, c: 195.5, currency: 'USD' })
})

// KRW 이름 검색
it('KRW: 이름 입력 시 fetchKrxSearch 호출', async () => {
  fetchKrxSearch.mockResolvedValue([
    { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
  ])
  render(<HoldingsTable {...defaultProps} />)
  fireEvent.click(screen.getByText('KRW'))
  fireEvent.change(screen.getByPlaceholderText('삼성전자'), { target: { value: '삼성' } })
  await waitFor(() => expect(fetchKrxSearch).toHaveBeenCalledWith('삼성'), { timeout: 500 })
})

it('KRW: 드롭다운 선택 시 티커·이름·거래소 자동 입력', async () => {
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

it('KRW: 종목 선택 후 추가 시 onAdd에 exchange 포함', async () => {
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

Expected: 신규 6개 FAIL

- [ ] **Step 3: HoldingsTable.jsx 수정**

현재 파일 전체를 아래 내용으로 교체:

```jsx
import { useState, useRef } from 'react'
import EditModal from './EditModal.jsx'
import { fmtCurrency, pct } from '../utils/format.js'
import { fetchQuote } from '../utils/finnhub.js'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../utils/stockSearch.js'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},
}) {
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
  const [tickerStatus, setTickerStatus] = useState('idle') // 'idle' | 'loading' | 'found' | 'error'
  const [editingIndex, setEditingIndex] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef(null)

  const isKRW = form.currency === 'KRW'
  const hasAutoHoldings = holdings.some(h =>
    (h.currency ?? 'USD') === 'USD' || (h.currency === 'KRW' && h.exchange)
  )
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  async function handleTickerBlur() {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker || form.currency !== 'USD') return
    setTickerStatus('loading')
    setForm(f => ({ ...f, cur: '' }))
    const price = await fetchQuote(ticker)
    setForm(f => {
      if (f.ticker.trim().toUpperCase() !== ticker) return f
      return { ...f, cur: price !== null ? String(price) : '' }
    })
    setTickerStatus(prev => {
      if (prev !== 'loading') return prev
      return price !== null ? 'found' : 'error'
    })
  }

  function handleNameChange(e) {
    const val = e.target.value
    setForm(f => ({ ...f, name: val, ticker: '', exchange: '', cur: '' }))
    setTickerStatus('idle')
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setSearchResults([]); setSearchOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const results = isKRW
        ? await fetchKrxSearch(val)
        : await fetchUsdSearch(val)
      setSearchResults(results)
      setSearchOpen(results.length > 0)
    }, 300)
  }

  async function handleSelect(item) {
    setSearchOpen(false)
    setSearchResults([])
    if (isKRW) {
      setForm(f => ({ ...f, name: item.name, ticker: item.ticker, exchange: item.exchange, cur: '' }))
      const price = await fetchKrxQuote(item.ticker, item.exchange)
      if (price !== null) setForm(f => ({ ...f, cur: String(price) }))
    } else {
      setForm(f => ({ ...f, name: item.name, ticker: item.ticker, cur: '' }))
      setTickerStatus('loading')
      const price = await fetchQuote(item.ticker)
      setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: price !== null ? String(price) : '' })
      setTickerStatus(price !== null ? 'found' : 'error')
    }
  }

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
    setSearchResults([])
    setSearchOpen(false)
  }

  function formatUpdatedAt(date) {
    if (!date) return null
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="holdings">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-dim)', margin: 0 }}>
          보유 종목
        </h2>
        {hasAutoHoldings && (
          <>
            <button
              onClick={onRefresh}
              disabled={priceLoading}
              title="주가 새로고침"
              style={{ background: 'none', border: '1px solid var(--ink-dim)', borderRadius: 4, color: 'var(--ink-dim)', cursor: priceLoading ? 'default' : 'pointer', fontSize: 12, padding: '2px 8px', opacity: priceLoading ? 0.5 : 1 }}
            >
              ↻
            </button>
            {lastUpdatedAt && (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: 'var(--ink-faint)' }}>
                {formatUpdatedAt(lastUpdatedAt)} 기준
              </span>
            )}
          </>
        )}
      </div>

      {priceError && (
        <div style={{ background: 'rgba(232,101,79,.12)', border: '1px solid rgba(232,101,79,.3)', borderRadius: 6, color: '#e8654f', fontSize: 12, marginBottom: 12, padding: '6px 12px' }}>
          ⚠ {priceError}
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>종목</th><th>수량</th><th>매수가</th><th>현재가</th>
              <th>평가액 ({dispSym})</th><th>손익 ({dispSym})</th><th>수익률</th><th>비중</th><th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr><td colSpan={9} className="empty">아직 종목이 없습니다. 아래에서 첫 종목을 추가해 보세요.</td></tr>
            ) : (
              holdings.map((h, i) => {
                const hCur = h.currency ?? 'USD'
                const val = toDisplay(h.q * h.c, hCur)
                const cost = toDisplay(h.q * h.b, hCur)
                const p = val - cost
                const r = cost > 0 ? p / cost * 100 : 0
                const w = totalVal > 0 ? val / totalVal * 100 : 0
                const isLive = prices[h.t] !== undefined
                return (
                  <tr key={i}>
                    <td>
                      <span className="tick">
                        {h.t}
                        {h.nm && <small>{h.nm}</small>}
                      </span>
                    </td>
                    <td>{h.q.toLocaleString()}</td>
                    <td>{fmtCurrency(h.b, hCur)}</td>
                    <td>
                      {isLive && <span style={{ color: '#3fbf8f', fontSize: 9, marginRight: 3 }}>●</span>}
                      {fmtCurrency(h.c, hCur)}
                    </td>
                    <td>{fmtCurrency(val, displayCurrency)}</td>
                    <td className={p >= 0 ? 'pos' : 'neg'}>{fmtCurrency(p, displayCurrency)}</td>
                    <td className={r >= 0 ? 'pos' : 'neg'}>{pct(r)}</td>
                    <td>{w.toFixed(1)}%</td>
                    <td>
                      <button className="edit" onClick={() => setEditingIndex(i)} title="수정">✎</button>
                      <button className="del" onClick={() => onDelete(i)} title="삭제">✕</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="addbar">
        <div className="field tk">
          <label>티커</label>
          <input
            placeholder="AAPL"
            value={form.ticker}
            readOnly={!!form.exchange || (tickerStatus === 'found' && !!form.ticker)}
            style={(!!form.exchange || tickerStatus === 'found') ? { opacity: 0.6 } : {}}
            onChange={e => {
              if (form.exchange) return
              setForm(f => ({ ...f, ticker: e.target.value }))
              if (tickerStatus !== 'idle') setTickerStatus('idle')
            }}
            onBlur={handleTickerBlur}
          />
        </div>
        <div className="field">
          <label>통화</label>
          <div className="currency-toggle">
            <button
              className={`currency-btn ${form.currency === 'USD' ? 'active' : ''}`}
              onClick={() => {
                setForm(f => ({ ...f, currency: 'USD', exchange: '', ticker: '', name: '', cur: '' }))
                setTickerStatus('idle')
                setSearchOpen(false)
                setSearchResults([])
              }}
            >USD</button>
            <button
              className={`currency-btn ${form.currency === 'KRW' ? 'active' : ''}`}
              onClick={() => {
                setForm(f => ({ ...f, currency: 'KRW', exchange: '', ticker: '', name: '', cur: '' }))
                setTickerStatus('idle')
                setSearchOpen(false)
                setSearchResults([])
              }}
            >KRW</button>
          </div>
        </div>
        <div className="field nm" style={{ position: 'relative' }}>
          <label>이름 검색</label>
          <input
            placeholder={isKRW ? '삼성전자' : 'Apple Inc.'}
            value={form.name}
            autoComplete="off"
            onChange={handleNameChange}
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map(item => (
                <div key={item.symbol} className="search-dropdown-item" onClick={() => handleSelect(item)}>
                  <span className="search-item-name">{item.name}</span>
                  <span className="search-item-meta">
                    {item.ticker}{item.exchange ? ` · ${item.exchange === 'KS' ? 'KOSPI' : 'KOSDAQ'}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label>수량</label>
          <input
            type="number" step="any" placeholder="10"
            value={form.qty}
            onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>매수단가</label>
          <input
            type="number" step="any"
            placeholder={isKRW ? '75000' : '150'}
            value={form.buy}
            onChange={e => setForm(f => ({ ...f, buy: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>현재가{tickerStatus === 'loading' ? ' 조회 중…' : ''}</label>
          <input
            type="number" step="any"
            placeholder={isKRW ? '82000' : '190'}
            value={form.cur}
            readOnly={tickerStatus === 'found'}
            style={tickerStatus === 'found' ? { opacity: 0.7 } : {}}
            onChange={e => {
              if (tickerStatus === 'found') return
              setForm(f => ({ ...f, cur: e.target.value }))
            }}
          />
          {tickerStatus === 'error' && (
            <span style={{ color: '#e8654f', fontSize: 10, display: 'block', marginTop: 2 }}>
              티커를 찾을 수 없습니다
            </span>
          )}
        </div>
        <button className="btn" onClick={handleAdd}>+ 추가</button>
      </div>
      {editingIndex !== null && (
        <EditModal
          holding={rawHoldings[editingIndex]}
          onSave={patch => { onEdit(editingIndex, patch); setEditingIndex(null) }}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
npx vitest run src/__tests__/components/HoldingsTable.test.jsx
```

Expected: 전체 PASS (기존 + 신규 6개 포함)

- [ ] **Step 5: 전체 테스트 확인**

```bash
npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/HoldingsTable.jsx src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: add stock name search typeahead for USD and KRW in HoldingsTable"
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
curl "https://<your-pages-url>/api/usd-search?q=apple"
# Expected: [{"symbol":"AAPL","name":"Apple Inc.","ticker":"AAPL"}, ...]

curl "https://<your-pages-url>/api/krx-search?q=삼성전자"
# Expected: [{"symbol":"005930.KS","name":"삼성전자","ticker":"005930","exchange":"KS"}, ...]

curl "https://<your-pages-url>/api/krx-quote?symbol=005930.KS"
# Expected: {"price":329000}
```

- [ ] **Step 3: 브라우저 기능 검증**

배포된 앱에서:

- USD 선택 → 이름 필드에 "apple" 입력 → 드롭다운에 "Apple Inc. · AAPL" 표시
- 선택 → 티커 자동 입력, 현재가 자동 조회 (Finnhub)
- KRW 선택 → "삼성" 입력 → 드롭다운에 "삼성전자 · 005930 · KOSPI" 표시
- 선택 → 티커 자동 입력, 현재가 자동 조회 (Yahoo Finance)
- 두 종목 모두 추가 후 `●` live 인디케이터 표시
- ↻ 버튼 → USD + KRW 모두 가격 재조회
