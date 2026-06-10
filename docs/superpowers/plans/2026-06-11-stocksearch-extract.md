# useStockSearch 추출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AddHoldingForm(231줄)의 종목 검색 로직을 `useStockSearch` 훅 + `StockSearchField` 표현 컴포넌트로 추출하고, 미커버였던 검색 로직에 훅 테스트를 신설한다. 검색 UX·DOM·CSS 변경 0.

**Architecture:** 훅은 부모(AddHoldingForm)가 소유 — 제출·매도 전환 시 `clear()`로 결정적 리셋이 가능해야 하기 때문. StockSearchField는 무상태 표현 컴포넌트. 시세 조회(`priceLoading`, stale 가드)는 폼 관심사라 AddHoldingForm에 유지. Task 1은 TDD(테스트 먼저).

**Tech Stack:** React hooks, Vitest (fake timers + vi.mock), @testing-library/react (renderHook)

**Spec:** `docs/superpowers/specs/2026-06-11-stocksearch-extract-design.md`

---

### Task 1: useStockSearch 훅 (TDD)

**Files:**
- Create: `src/__tests__/hooks/useStockSearch.test.js`
- Create: `src/hooks/useStockSearch.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/hooks/useStockSearch.test.js` 생성:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStockSearch } from '../../hooks/useStockSearch.js'
import { fetchUsdSearch, fetchKrxSearch } from '../../utils/stockSearch.js'

vi.mock('../../utils/stockSearch.js', () => ({
  fetchUsdSearch: vi.fn(),
  fetchKrxSearch: vi.fn(),
}))

beforeEach(() => {
  vi.useFakeTimers()
  fetchUsdSearch.mockReset()
  fetchKrxSearch.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useStockSearch', () => {
  it('빈 쿼리는 결과를 비우고 API를 호출하지 않는다', async () => {
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('   ') })
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(result.current.results).toEqual([])
    expect(result.current.open).toBe(false)
    expect(fetchKrxSearch).not.toHaveBeenCalled()
    expect(fetchUsdSearch).not.toHaveBeenCalled()
  })

  it('연속 호출 시 마지막 쿼리만 디바운스 후 1회 검색한다', async () => {
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockResolvedValue([{ symbol: 'AAPL', ticker: 'AAPL', name: 'Apple' }])
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('a') })
    act(() => { vi.advanceTimersByTime(100) })
    act(() => { result.current.search('aa') })
    act(() => { vi.advanceTimersByTime(100) })
    act(() => { result.current.search('aap') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(fetchKrxSearch).toHaveBeenCalledTimes(1)
    expect(fetchKrxSearch).toHaveBeenCalledWith('aap')
    expect(fetchUsdSearch).toHaveBeenCalledTimes(1)
    expect(fetchUsdSearch).toHaveBeenCalledWith('aap')
  })

  it('KRX 먼저 + market 매핑 + 8개 제한으로 병합한다', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', ticker: '005930', name: '삼성전자', exchange: 'KS' },
      { symbol: '035720.KQ', ticker: '035720', name: '카카오', exchange: 'KQ' },
    ])
    fetchUsdSearch.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({ symbol: `T${i}`, ticker: `T${i}`, name: `Stock ${i}` }))
    )
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('삼성') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(result.current.results).toHaveLength(8)
    expect(result.current.results[0]).toMatchObject({ ticker: '005930', market: 'KOSPI' })
    expect(result.current.results[1]).toMatchObject({ ticker: '035720', market: 'KOSDAQ' })
    expect(result.current.results[2]).toMatchObject({ ticker: 'T0', market: 'US' })
    expect(result.current.open).toBe(true)
  })

  it('결과가 없으면 드롭다운을 열지 않는다', async () => {
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockResolvedValue([])
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('zzzz') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(result.current.results).toEqual([])
    expect(result.current.open).toBe(false)
  })

  it('clear()는 대기 중인 검색을 취소한다', async () => {
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockResolvedValue([])
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('aapl') })
    act(() => { result.current.clear() })
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(fetchKrxSearch).not.toHaveBeenCalled()
    expect(fetchUsdSearch).not.toHaveBeenCalled()
    expect(result.current.open).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/__tests__/hooks/useStockSearch.test.js`
Expected: FAIL — `Cannot find module '../../hooks/useStockSearch.js'` 또는 동급의 import 에러

- [ ] **Step 3: 훅 구현**

`src/hooks/useStockSearch.js` 생성 (디바운스 블록은 현재 AddHoldingForm.jsx `handleNameChange` 26-43행의 로직을 그대로 이전):

```js
import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchUsdSearch, fetchKrxSearch } from '../utils/stockSearch.js'

const DEBOUNCE_MS = 300
const MAX_RESULTS = 8

// 종목 검색 훅 — KRX/USD 동시 검색, 디바운스, 드롭다운 상태 관리.
//   search(query): 디바운스 후 검색 실행. 빈 쿼리는 즉시 초기화 (API 미호출)
//   clear():       대기 중 검색 취소 + 결과/드롭다운 초기화 (제출·모드 전환용)
//   close():       드롭다운만 닫기 (input blur용)
export function useStockSearch() {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => { return () => clearTimeout(debounceRef.current) }, [])

  const search = useCallback((query) => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const [krwResults, usdResults] = await Promise.all([
        fetchKrxSearch(query),
        fetchUsdSearch(query),
      ])
      const all = [
        ...krwResults.map(r => ({ ...r, market: r.exchange === 'KS' ? 'KOSPI' : 'KOSDAQ' })),
        ...usdResults.map(r => ({ ...r, market: 'US' })),
      ].slice(0, MAX_RESULTS)
      setResults(all)
      setOpen(all.length > 0)
    }, DEBOUNCE_MS)
  }, [])

  const clear = useCallback(() => {
    clearTimeout(debounceRef.current)
    setResults([])
    setOpen(false)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  return { results, open, search, clear, close }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/__tests__/hooks/useStockSearch.test.js`
Expected: 5 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/__tests__/hooks/useStockSearch.test.js src/hooks/useStockSearch.js
git commit -m "feat: useStockSearch 훅 추출 + 테스트 (TDD)"
```

---

### Task 2: StockSearchField + AddHoldingForm 통합

**Files:**
- Create: `src/components/StockSearchField.jsx`
- Modify: `src/components/AddHoldingForm.jsx` (231줄 → ~150줄)
- Test: 기존 테스트 전체 (**무수정**)

- [ ] **Step 1: StockSearchField.jsx 작성**

`src/components/StockSearchField.jsx` 생성 (현재 AddHoldingForm.jsx 158-181행 `.field.nm` 블록과 동일 DOM, 표현 전용):

```jsx
// 종목 검색 입력 필드 + 드롭다운 (표현 전용 — 검색 상태는 부모의 useStockSearch가 소유)
export default function StockSearchField({
  value, onQueryChange, onSelect,
  results, open, onClose,
  label, badge, placeholder,
}) {
  return (
    <div className="field nm">
      <label>
        {label}
        {badge}
      </label>
      <input
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={e => onQueryChange(e.target.value)}
        onBlur={() => setTimeout(onClose, 150)}
      />
      {open && results.length > 0 && (
        <div className="search-dropdown">
          {results.map(item => (
            <div key={item.symbol} className="search-dropdown-item" onClick={() => onSelect(item)}>
              <span className="search-item-name">{item.name}</span>
              <span className="search-item-meta">{item.ticker} · {item.market}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: AddHoldingForm.jsx 전체 교체**

`src/components/AddHoldingForm.jsx`를 아래로 **전체 교체**한다 (검색 상태 4개 제거, `useStockSearch` + `StockSearchField` 사용, 매도 폼·제출 로직은 기존 그대로):

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuote } from '../utils/finnhub.js'
import { fetchKrxQuote } from '../utils/stockSearch.js'
import { useStockSearch } from '../hooks/useStockSearch.js'
import StockSearchField from './StockSearchField.jsx'

export default function AddHoldingForm({ onAddTransaction, holdings = [] }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)

  const [type, setType] = useState('buy')
  const [date, setDate] = useState(today)

  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
  const [priceLoading, setPriceLoading] = useState(false)
  const search = useStockSearch()

  const [sellTicker, setSellTicker] = useState('')
  const [sellQty, setSellQty] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellError, setSellError] = useState('')

  function handleNameChange(val) {
    setForm(f => ({ ...f, name: val, ticker: '', exchange: '', cur: '', currency: 'USD' }))
    search.search(val)
  }

  async function handleSelect(item) {
    search.clear()
    const isKRW = !!item.exchange
    const currency = isKRW ? 'KRW' : 'USD'
    setForm(f => ({ ...f, name: item.name, ticker: item.ticker, currency, exchange: item.exchange || '', cur: '' }))
    setPriceLoading(true)
    const price = isKRW
      ? await fetchKrxQuote(item.ticker, item.exchange)
      : await fetchQuote(item.ticker)
    setPriceLoading(false)
    if (price !== null) setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: String(price) })
  }

  function handleBuySubmit() {
    const ticker = form.ticker.trim().toUpperCase()
    const nm = form.name.trim()
    const qty = parseFloat(form.qty)
    const price = parseFloat(form.buy)
    const cur = parseFloat(form.cur)
    if (!ticker || !(qty > 0) || !(price >= 0) || !(cur >= 0)) {
      alert(t('addHolding.validationError'))
      return
    }
    onAddTransaction({
      type: 'buy',
      ticker,
      name: nm,
      currency: form.currency,
      exchange: form.exchange || undefined,
      date,
      qty,
      price,
    })
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
    setPriceLoading(false)
    search.clear()
    setDate(today)
  }

  function handleSellSubmit() {
    setSellError('')
    const holding = holdings.find(h => h.t === sellTicker)
    const qty = parseFloat(sellQty)
    const price = parseFloat(sellPrice)
    if (!sellTicker || !(qty > 0) || !(price >= 0)) {
      alert(t('addHolding.validationError'))
      return
    }
    if (holding && qty > holding.q) {
      setSellError(t('tx.sellExceedsHolding'))
      return
    }
    onAddTransaction({
      type: 'sell',
      ticker: sellTicker,
      name: holding?.nm ?? sellTicker,
      currency: holding?.currency ?? 'USD',
      exchange: holding?.exchange || undefined,
      date,
      qty,
      price,
    })
    setSellTicker('')
    setSellQty('')
    setSellPrice('')
    setSellError('')
    setDate(today)
  }

  const selectedMarket = form.ticker
    ? (form.exchange === 'KS' ? 'KOSPI' : form.exchange === 'KQ' ? 'KOSDAQ' : 'US')
    : null

  return (
    <div className="addbar">
      <div className="field">
        <label>{t('tx.type')}</label>
        <div className="currency-toggle">
          <button
            className={`currency-btn ${type === 'buy' ? 'active' : ''}`}
            onClick={() => {
              setType('buy')
              setSellError('')
              setSellTicker('')
              setSellQty('')
              setSellPrice('')
            }}
          >{t('tx.buy')}</button>
          <button
            className={`currency-btn ${type === 'sell' ? 'active sell-btn' : ''}`}
            onClick={() => {
              setType('sell')
              setSellError('')
              setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
              setPriceLoading(false)
              search.clear()
            }}
          >{t('tx.sell')}</button>
        </div>
      </div>

      <div className="field">
        <label>{t('tx.date')}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {type === 'buy' ? (
        <>
          <StockSearchField
            value={form.name}
            onQueryChange={handleNameChange}
            onSelect={handleSelect}
            results={search.results}
            open={search.open}
            onClose={search.close}
            label={t('addHolding.searchName')}
            badge={
              <>
                {selectedMarket && <span className="market-badge">{form.ticker} · {selectedMarket}</span>}
                {priceLoading && <span style={{ marginLeft: 6, opacity: 0.6 }}>{t('addHolding.loading')}</span>}
              </>
            }
            placeholder="삼성전자 · Apple · AAPL · 005930"
          />
          <div className="field">
            <label>{t('addHolding.qty')}</label>
            <input type="number" step="any" placeholder="10" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('addHolding.avgCost')}</label>
            <input type="number" step="any" placeholder="150" value={form.buy} onChange={e => setForm(f => ({ ...f, buy: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('addHolding.currentPrice')}</label>
            <input
              type="number" step="any" placeholder="190"
              value={form.cur}
              onChange={e => setForm(f => ({ ...f, cur: e.target.value }))}
            />
          </div>
          <button className="btn" onClick={handleBuySubmit}>{t('addHolding.addButton')}</button>
        </>
      ) : (
        <>
          {holdings.length === 0 ? (
            <p className="news-empty">{t('tx.noHoldingsToSell')}</p>
          ) : (
            <>
              <div className="field">
                <label>{t('addHolding.ticker')}</label>
                <select value={sellTicker} onChange={e => { setSellTicker(e.target.value); setSellError('') }}>
                  <option value="">--</option>
                  {holdings.map(h => (
                    <option key={h.t} value={h.t}>{h.t}{h.nm && h.nm !== h.t ? ` · ${h.nm}` : ''} ({h.q.toLocaleString()}주)</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t('tx.qty')}</label>
                <input type="number" step="any" placeholder="5" value={sellQty} onChange={e => { setSellQty(e.target.value); setSellError('') }} />
                {sellError && <span className="ticker-error">{sellError}</span>}
              </div>
              <div className="field">
                <label>{t('tx.price')}</label>
                <input type="number" step="any" placeholder="200" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
              </div>
              <button className="btn" onClick={handleSellSubmit}>{t('tx.sell')}</button>
            </>
          )}
        </>
      )}
    </div>
  )
}
```

원본 대비 변경 요약 (리뷰 참고용): `handleNameChange`가 이벤트 대신 값을 받음, 검색 상태 4개(`searchResults`/`searchOpen`/`debounceRef`/cleanup effect) 제거, 제출·매도 전환의 수동 리셋 3줄 → `search.clear()`, `.field.nm` 블록 → `<StockSearchField>`. **그 외 폼·매도·제출 로직은 글자 단위 동일.**

- [ ] **Step 3: 전체 테스트**

Run: `npm test`
Expected: 208 tests PASS (기존 203 + Task 1의 신규 5)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add src/components/StockSearchField.jsx src/components/AddHoldingForm.jsx
git commit -m "refactor: AddHoldingForm 검색 UI를 StockSearchField로 분리"
```

---

### Task 3: 육안 검증 (사용자 확인)

**Files:** 없음 (검증만)

- [ ] **Step 1: dev 서버 실행**

Run: `npm run dev` (백그라운드, 이미 떠 있으면 재사용)
Expected: http://localhost:5173

- [ ] **Step 2: 사용자 육안 확인 요청**

직접 상호작용 테스트가 없던 영역이므로 사용자에게 확인 요청:
- 매수 모드: 종목 검색(한글 "삼성", 영문 "AAPL") → 드롭다운 표시 → 항목 선택 → 티커·마켓 뱃지 + 현재가 자동 입력
- 입력창 밖 클릭 시 드롭다운 닫힘
- 매수 추가 후 폼·드롭다운 리셋
- 매도 모드 전환 시 검색 상태 리셋

- [ ] **Step 3: 이상 발견 시**

`git show HEAD~2:src/components/AddHoldingForm.jsx`(원본)과 비교해 누락 로직 확인 후 수정, `npm test` 재실행, 사용자 재확인 후 커밋.
