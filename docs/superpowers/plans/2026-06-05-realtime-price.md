# Realtime US Stock Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** USD 종목에 한해 Finnhub API로 실시간 주가를 조회하고, KRW 종목은 기존 수동 입력 방식을 유지한다.

**Architecture:** `useStockPrices(tickers)` 훅이 USD 티커 목록을 받아 Finnhub에서 순차 조회하여 인메모리 `prices` 맵을 반환한다. App이 `effectiveHoldings`(live price 반영본)를 파생시켜 Charts·HoldingsTable에 전달하므로 두 컴포넌트의 내부 가격 계산 로직은 변경 없다. 폼에서 ticker blur 시 단건 조회로 현재가를 자동 입력한다.

**Tech Stack:** React 18, Vite, Finnhub REST API (`/quote`), Vitest, @testing-library/react

---

## File Map

| 작업 | 파일 |
|------|------|
| 생성 | `src/utils/finnhub.js` |
| 생성 | `src/hooks/useStockPrices.js` |
| 생성 | `.env.example` |
| 생성 | `src/__tests__/finnhub.test.js` |
| 생성 | `src/__tests__/hooks/useStockPrices.test.js` |
| 수정 | `src/App.jsx` |
| 수정 | `src/components/HoldingsTable.jsx` |
| 수정 | `src/__tests__/components/HoldingsTable.test.jsx` |

---

### Task 1: Environment Setup

**Files:**
- Create: `.env.example`

- [ ] **Step 1: .env.example 생성**

```
VITE_FINNHUB_KEY=your_finnhub_api_key_here
```

- [ ] **Step 2: .gitignore 확인**

`.gitignore`에 `.env`가 이미 포함되어 있는지 확인한다. 없으면 추가:

```
.env
```

- [ ] **Step 3: .env 파일 직접 생성 (로컬 전용)**

프로젝트 루트에 `.env` 파일을 만들고 Finnhub에서 발급받은 키를 입력한다. (https://finnhub.io → Sign up → API key)

```
VITE_FINNHUB_KEY=실제_키값
```

- [ ] **Step 4: 커밋**

```bash
git add .env.example
git commit -m "chore: add .env.example for Finnhub API key"
```

---

### Task 2: fetchQuote Utility

**Files:**
- Create: `src/utils/finnhub.js`
- Create: `src/__tests__/finnhub.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/finnhub.test.js` 생성:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchQuote } from '../utils/finnhub.js'

afterEach(() => vi.restoreAllMocks())

describe('fetchQuote', () => {
  it('returns current price when API succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ c: 195.5 }),
    })
    expect(await fetchQuote('AAPL', 'test-key')).toBe(195.5)
  })

  it('returns null when c is 0 (unrecognized ticker or pre-market)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ c: 0 }),
    })
    expect(await fetchQuote('INVALID', 'test-key')).toBeNull()
  })

  it('returns null when fetch throws (network error)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'))
    expect(await fetchQuote('AAPL', 'test-key')).toBeNull()
  })

  it('returns null when apiKey is empty string', async () => {
    expect(await fetchQuote('AAPL', '')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm test -- --reporter=verbose src/__tests__/finnhub.test.js
```

Expected: `fetchQuote` 미정의 오류로 FAIL

- [ ] **Step 3: 구현 작성**

`src/utils/finnhub.js` 생성:

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

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm test -- --reporter=verbose src/__tests__/finnhub.test.js
```

Expected: 4 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/finnhub.js src/__tests__/finnhub.test.js
git commit -m "feat: add fetchQuote utility for Finnhub /quote endpoint"
```

---

### Task 3: useStockPrices Hook

**Files:**
- Create: `src/hooks/useStockPrices.js`
- Create: `src/__tests__/hooks/useStockPrices.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/hooks/useStockPrices.test.js` 생성:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useStockPrices } from '../../hooks/useStockPrices.js'
import { fetchQuote } from '../../utils/finnhub.js'

vi.mock('../../utils/finnhub.js', () => ({ fetchQuote: vi.fn() }))

describe('useStockPrices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches prices for all USD tickers on mount', async () => {
    fetchQuote.mockImplementation(t => Promise.resolve(t === 'AAPL' ? 195.5 : 875.2))
    const { result } = renderHook(() => useStockPrices(['AAPL', 'NVDA']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices).toEqual({ AAPL: 195.5, NVDA: 875.2 })
  })

  it('sets error when all fetches return null', async () => {
    fetchQuote.mockResolvedValue(null)
    const { result } = renderHook(() => useStockPrices(['AAPL']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })

  it('does not call fetchQuote when tickers is empty', async () => {
    const { result } = renderHook(() => useStockPrices([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchQuote).not.toHaveBeenCalled()
    expect(result.current.prices).toEqual({})
  })

  it('refresh re-fetches with updated prices', async () => {
    fetchQuote.mockResolvedValue(195.5)
    const { result } = renderHook(() => useStockPrices(['AAPL']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    fetchQuote.mockResolvedValue(200.0)
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices.AAPL).toBe(200.0)
  })

  it('sets lastUpdatedAt after successful fetch', async () => {
    fetchQuote.mockResolvedValue(195.5)
    const { result } = renderHook(() => useStockPrices(['AAPL']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm test -- --reporter=verbose src/__tests__/hooks/useStockPrices.test.js
```

Expected: `useStockPrices` 미정의 오류로 FAIL

- [ ] **Step 3: 구현 작성**

`src/hooks/useStockPrices.js` 생성:

```js
import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchQuote } from '../utils/finnhub.js'

export function useStockPrices(tickers) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const tickersRef = useRef(tickers)

  useEffect(() => { tickersRef.current = tickers }, [tickers])

  const fetchAll = useCallback(async () => {
    const list = tickersRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    const result = {}
    for (const ticker of list) {
      const price = await fetchQuote(ticker)
      if (price !== null) result[ticker] = price
    }
    if (Object.keys(result).length === 0) {
      setError('주가 조회에 실패했습니다')
    } else {
      setPrices(prev => ({ ...prev, ...result }))
      setLastUpdatedAt(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { prices, loading, error, lastUpdatedAt, refresh: fetchAll }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm test -- --reporter=verbose src/__tests__/hooks/useStockPrices.test.js
```

Expected: 5 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useStockPrices.js src/__tests__/hooks/useStockPrices.test.js
git commit -m "feat: add useStockPrices hook for batch Finnhub price fetching"
```

---

### Task 4: App.jsx Integration

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: App.jsx 수정**

`src/App.jsx` 전체를 아래로 교체한다:

```jsx
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useExchangeRate } from './hooks/useExchangeRate.js'
import { useStockPrices } from './hooks/useStockPrices.js'
import Header from './components/Header.jsx'
import Charts from './components/Charts.jsx'
import HoldingsTable from './components/HoldingsTable.jsx'
import SnapshotBar from './components/SnapshotBar.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export default function App() {
  const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrency, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const usdTickers = holdings.filter(h => h.currency === 'USD').map(h => h.t)
  const { prices, loading: priceLoading, error: priceError, lastUpdatedAt, refresh } = useStockPrices(usdTickers)

  const effectiveHoldings = holdings.map(h => ({
    ...h,
    c: h.currency === 'USD' ? (prices[h.t] ?? h.c) : h.c,
  }))

  const effectiveDisplayCurrency = exchangeRate.rate ? displayCurrency : 'USD'

  function toDisplay(amount, fromCurrency) {
    if (!exchangeRate.rate || fromCurrency === effectiveDisplayCurrency) return amount
    return effectiveDisplayCurrency === 'KRW'
      ? amount * exchangeRate.rate
      : amount / exchangeRate.rate
  }

  const totalVal = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
  const totalCost = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
  const pl = totalVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0

  function addHolding({ t, nm, q, b, c, currency }) {
    setHoldings([...holdings, { t, nm, q, b, c, currency }])
  }

  function delHolding(i) {
    setHoldings(holdings.filter((_, idx) => idx !== i))
  }

  function toggleCurrency() {
    if (!exchangeRate.rate) return
    setDisplayCurrency(prev => prev === 'USD' ? 'KRW' : 'USD')
  }

  function takeSnapshot() {
    if (holdings.length === 0) { alert('먼저 종목을 추가해 주세요.'); return }
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const next = [...snaps, { label, total: totalVal, currency: effectiveDisplayCurrency }]
    setSnaps(next.length > 60 ? next.slice(-60) : next)
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  return (
    <div className="wrap">
      <Header
        totalVal={totalVal}
        totalCost={totalCost}
        pl={pl}
        ret={ret}
        displayCurrency={effectiveDisplayCurrency}
        onToggleCurrency={toggleCurrency}
        exchangeRate={exchangeRate}
      />
      <Charts
        holdings={effectiveHoldings}
        snaps={snaps}
        totalVal={totalVal}
        displayCurrency={effectiveDisplayCurrency}
        toDisplay={toDisplay}
      />
      <HoldingsTable
        holdings={effectiveHoldings}
        totalVal={totalVal}
        onAdd={addHolding}
        onDelete={delHolding}
        displayCurrency={effectiveDisplayCurrency}
        toDisplay={toDisplay}
        prices={prices}
        priceLoading={priceLoading}
        priceError={priceError}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={refresh}
      />
      <SnapshotBar onSnapshot={takeSnapshot} onClear={clearSnaps} />
      <footer>
        데이터는 이 브라우저에만 저장됩니다 · 투자 판단의 근거가 아닌 기록·시각화 용도입니다<br />
        Ledger v2 — live US prices via Finnhub
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: 기존 테스트 전체 실행 — 회귀 없음 확인**

```bash
npm test
```

Expected: 모든 기존 테스트 PASS (HoldingsTable 기존 테스트도 포함)

- [ ] **Step 3: 커밋**

```bash
git add src/App.jsx
git commit -m "feat: integrate useStockPrices into App, derive effectiveHoldings"
```

---

### Task 5: HoldingsTable Form — Ticker Blur Auto-Fetch

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

- [ ] **Step 1: 새 테스트 추가**

`src/__tests__/components/HoldingsTable.test.jsx` 파일 상단 import 블록에 추가:

```js
import { vi } from 'vitest'

vi.mock('../../../src/utils/finnhub.js', () => ({ fetchQuote: vi.fn() }))
// 경로 주의 — 테스트 파일 위치가 src/__tests__/components/ 이므로:
```

실제 경로는 `../../utils/finnhub.js`. 파일 전체를 아래로 교체한다:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HoldingsTable from '../../components/HoldingsTable.jsx'
import { fetchQuote } from '../../utils/finnhub.js'

vi.mock('../../utils/finnhub.js', () => ({ fetchQuote: vi.fn() }))

const mockHoldings = [
  { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190, currency: 'USD' },
]
const identity = (n) => n

const defaultProps = {
  holdings: [],
  totalVal: 0,
  onAdd: vi.fn(),
  onDelete: vi.fn(),
  displayCurrency: 'USD',
  toDisplay: identity,
  prices: {},
  priceLoading: false,
  priceError: null,
  lastUpdatedAt: null,
  onRefresh: vi.fn(),
}

describe('HoldingsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('종목 없을 때 빈 안내 메시지 표시', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.getByText(/종목이 없습니다/)).toBeInTheDocument()
  })

  it('종목 티커 표시', () => {
    render(<HoldingsTable {...defaultProps} holdings={mockHoldings} totalVal={1900} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 onDelete 호출', () => {
    const onDelete = vi.fn()
    render(<HoldingsTable {...defaultProps} holdings={mockHoldings} totalVal={1900} onDelete={onDelete} />)
    fireEvent.click(screen.getByTitle('삭제'))
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('폼 입력 후 추가 버튼 클릭 시 onAdd에 currency 포함', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: 'TSLA' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '200' } })
    fireEvent.change(screen.getByPlaceholderText('190'), { target: { value: '250' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: 'TSLA', nm: '', q: 5, b: 200, c: 250, currency: 'USD' })
  })

  it('폼 통화 KRW 선택 후 추가 시 currency: KRW', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('KRW'))
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: '005930' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '10' } })
    fireEvent.change(screen.getByPlaceholderText('75000'), { target: { value: '75000' } })
    fireEvent.change(screen.getByPlaceholderText('82000'), { target: { value: '82000' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: '005930', nm: '', q: 10, b: 75000, c: 82000, currency: 'KRW' })
  })

  it('테이블이 table-scroll 래퍼 안에 존재한다', () => {
    const { container } = render(<HoldingsTable {...defaultProps} />)
    const wrapper = container.querySelector('.table-scroll')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper.querySelector('table')).toBeInTheDocument()
  })

  it('USD 티커 blur 시 fetchQuote 호출 후 현재가 자동 입력', async () => {
    fetchQuote.mockResolvedValueOnce(195.5)
    render(<HoldingsTable {...defaultProps} />)
    const tickerInput = screen.getByPlaceholderText('AAPL')
    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.blur(tickerInput)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('190').value).toBe('195.5')
    })
    expect(fetchQuote).toHaveBeenCalledWith('AAPL')
  })

  it('USD 티커 blur 시 fetchQuote null 반환 → 현재가 비워짐', async () => {
    fetchQuote.mockResolvedValueOnce(null)
    render(<HoldingsTable {...defaultProps} />)
    const tickerInput = screen.getByPlaceholderText('AAPL')
    fireEvent.change(tickerInput, { target: { value: 'INVALID' } })
    fireEvent.blur(tickerInput)
    await waitFor(() => {
      expect(screen.getByText(/티커를 찾을 수 없습니다/)).toBeInTheDocument()
    })
  })

  it('KRW 선택 시 티커 blur에서 fetchQuote 호출하지 않음', async () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('KRW'))
    const tickerInput = screen.getByPlaceholderText('AAPL')
    fireEvent.change(tickerInput, { target: { value: '005930' } })
    fireEvent.blur(tickerInput)
    expect(fetchQuote).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트 실행 — 새 테스트 실패 확인**

```bash
npm test -- --reporter=verbose src/__tests__/components/HoldingsTable.test.jsx
```

Expected: 기존 6개 PASS, 새 3개 FAIL

- [ ] **Step 3: HoldingsTable.jsx 수정**

`src/components/HoldingsTable.jsx` 전체를 교체한다:

```jsx
import { useState } from 'react'
import { fmtCurrency, pct } from '../utils/format.js'
import { fetchQuote } from '../utils/finnhub.js'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
}) {
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD' })
  const [tickerStatus, setTickerStatus] = useState('idle') // 'idle' | 'loading' | 'found' | 'error'

  const isKRW = form.currency === 'KRW'
  const hasUsdHoldings = holdings.some(h => (h.currency ?? 'USD') === 'USD')
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  async function handleTickerBlur() {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker || form.currency !== 'USD') return
    setTickerStatus('loading')
    setForm(f => ({ ...f, cur: '' }))
    const price = await fetchQuote(ticker)
    if (price !== null) {
      setForm(f => ({ ...f, cur: String(price) }))
      setTickerStatus('found')
    } else {
      setTickerStatus('error')
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
    onAdd({ t, nm, q, b, c, currency: form.currency })
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: form.currency })
    setTickerStatus('idle')
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
        {hasUsdHoldings && (
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
                const isLive = hCur === 'USD' && prices[h.t] !== undefined
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
            onChange={e => {
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
              onClick={() => { setForm(f => ({ ...f, currency: 'USD' })); setTickerStatus('idle') }}
            >USD</button>
            <button
              className={`currency-btn ${form.currency === 'KRW' ? 'active' : ''}`}
              onClick={() => { setForm(f => ({ ...f, currency: 'KRW' })); setTickerStatus('idle') }}
            >KRW</button>
          </div>
        </div>
        <div className="field nm">
          <label>이름(선택)</label>
          <input
            placeholder="Apple Inc."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
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
    </div>
  )
}
```

- [ ] **Step 4: 테스트 실행 — 전체 통과 확인**

```bash
npm test -- --reporter=verbose src/__tests__/components/HoldingsTable.test.jsx
```

Expected: 9 tests PASS

- [ ] **Step 5: 전체 테스트 실행**

```bash
npm test
```

Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/HoldingsTable.jsx src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: auto-fetch USD price on ticker blur, add refresh button and live indicator"
```

---

### Task 6: Smoke Test — 브라우저 확인

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

- [ ] **Step 2: USD 종목 추가 확인**

1. 폼에서 통화 **USD** 선택 확인 (기본값)
2. 티커에 `AAPL` 입력 후 Tab 또는 다른 필드 클릭
3. **현재가 필드가 자동으로 채워지는지** 확인
4. 매수단가 입력 → `+ 추가` 클릭
5. 테이블에 AAPL 행이 생기고 현재가 셀에 **● (초록 dot)** 표시되는지 확인
6. 헤더 영역에 **↻ 새로고침** 버튼과 업데이트 시간 표시 확인

- [ ] **Step 3: 새로고침 버튼 확인**

↻ 버튼 클릭 → 로딩 중 버튼 비활성화 → 완료 후 시간 업데이트 확인

- [ ] **Step 4: KRW 종목 추가 — 수동 입력 유지 확인**

1. 통화 **KRW** 선택
2. 티커 입력 후 blur → 현재가 필드가 **비어 있고 수동 입력 가능**한지 확인
3. 현재가 수동 입력 후 추가

- [ ] **Step 5: 환율 전환 확인**

USD/KRW 토글 시 모든 값이 정상 환산되는지 확인

- [ ] **Step 6: 최종 커밋 (필요 시 마이너 수정 후)**

```bash
git add -p
git commit -m "fix: <smoke test에서 발견된 문제 기술>"
```

문제 없으면 커밋 불필요.
