# usePortfolio Hook Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all business logic from `App.jsx` into a single `usePortfolio` hook, reducing App to a ~30-line routing/UI shell.

**Architecture:** Create `src/hooks/usePortfolio.js` that internally composes the four existing hooks (`useLocalStorage`, `useExchangeRate`, `useStockPrices`, `useKrxPrices`) and exposes a single object. App calls `usePortfolio()` and passes the result as one `portfolio` prop to DashboardPage instead of 13 individual props.

**Tech Stack:** React hooks (useMemo, useState), existing custom hooks

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Create | `src/hooks/usePortfolio.js` | New hook — all business logic |
| Modify | `src/App.jsx` | Replace logic with `usePortfolio()` call |
| Modify | `src/pages/DashboardPage.jsx` | `{ portfolio }` single prop |

---

### Task 1: Establish baseline

**Files:**
- Read: `src/__tests__/` (all test files)

- [ ] **Step 1: Run the full test suite and confirm all tests pass**

```bash
npm test -- --run
```

Expected: all tests pass (green). If any are failing before we start, note which ones so we don't count them as regressions.

- [ ] **Step 2: Note the passing test count**

Record the number shown in the summary line (e.g. `✓ 24 tests passed`). This is the target to match at the end.

---

### Task 2: Create `usePortfolio.js`

**Files:**
- Create: `src/hooks/usePortfolio.js`

- [ ] **Step 1: Create the file with the full implementation**

`src/hooks/usePortfolio.js`:
```js
import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { useExchangeRate } from './useExchangeRate.js'
import { useStockPrices } from './useStockPrices.js'
import { useKrxPrices } from './useKrxPrices.js'

export function usePortfolio() {
  const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const usdTickers = useMemo(
    () => holdings.filter(h => h.currency === 'USD').map(h => h.t),
    [holdings]
  )
  const { prices: usdPrices, loading: usdLoading, error: usdError, lastUpdatedAt, refresh: refreshUsd } = useStockPrices(usdTickers)

  const krwHoldings = useMemo(
    () => holdings.filter(h => h.currency === 'KRW' && h.exchange).map(h => ({ t: h.t, exchange: h.exchange })),
    [holdings]
  )
  const { prices: krwPrices, loading: krwLoading, error: krwError, refresh: refreshKrw } = useKrxPrices(krwHoldings)

  const prices = useMemo(() => ({ ...usdPrices, ...krwPrices }), [usdPrices, krwPrices])
  const priceLoading = usdLoading || krwLoading
  const priceError = usdError || krwError || null

  const displayCurrency = exchangeRate.rate ? displayCurrencyRaw : 'USD'

  const effectiveHoldings = holdings.map(h => ({
    ...h,
    c: prices[h.t] !== undefined ? prices[h.t] : h.c,
  }))

  function toDisplay(amount, fromCurrency) {
    if (!exchangeRate.rate || fromCurrency === displayCurrency) return amount
    return displayCurrency === 'KRW'
      ? amount * exchangeRate.rate
      : amount / exchangeRate.rate
  }

  const totalVal = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
  const totalCost = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
  const pl = totalVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0

  function addHolding({ t, nm, q, b, c, currency, exchange }) {
    const holding = { t, nm, q, b, c, currency }
    if (exchange) holding.exchange = exchange
    setHoldings([...holdings, holding])
  }

  function delHolding(i) {
    setHoldings(holdings.filter((_, idx) => idx !== i))
  }

  function editHolding(i, patch) {
    setHoldings(holdings.map((h, idx) => idx === i ? { ...h, ...patch } : h))
  }

  function toggleCurrency() {
    if (!exchangeRate.rate) return
    setDisplayCurrency(prev => prev === 'USD' ? 'KRW' : 'USD')
  }

  function takeSnapshot() {
    if (holdings.length === 0) { alert('먼저 종목을 추가해 주세요.'); return }
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const next = [...snaps, { label, total: totalVal, currency: displayCurrency }]
    setSnaps(next.length > 60 ? next.slice(-60) : next)
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  return {
    holdings,
    effectiveHoldings,
    snaps,
    displayCurrency,
    exchangeRate,
    totalVal,
    totalCost,
    pl,
    ret,
    toDisplay,
    prices,
    priceLoading,
    priceError,
    lastUpdatedAt,
    onRefresh: () => { refreshUsd(); refreshKrw() },
    addHolding,
    delHolding,
    editHolding,
    toggleCurrency,
    takeSnapshot,
    clearSnaps,
  }
}
```

- [ ] **Step 2: Run tests — expect same count as baseline (no regressions)**

```bash
npm test -- --run
```

Expected: same pass count as Task 1. The new file has no tests (it's a composition of already-tested hooks), and existing tests don't import App so nothing breaks.

---

### Task 3: Rewrite `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace the entire file content**

`src/App.jsx`:
```jsx
import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { usePortfolio } from './hooks/usePortfolio.js'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import NewsPage from './pages/NewsPage.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const portfolio = usePortfolio()

  return (
    <div className="wrap">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header
        totalVal={portfolio.totalVal}
        totalCost={portfolio.totalCost}
        pl={portfolio.pl}
        ret={portfolio.ret}
        displayCurrency={portfolio.displayCurrency}
        onToggleCurrency={portfolio.toggleCurrency}
        exchangeRate={portfolio.exchangeRate}
        onMenuOpen={() => setSidebarOpen(true)}
      />
      <Routes>
        <Route path="/" element={<DashboardPage portfolio={portfolio} />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/news" element={<NewsPage />} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 2: Run tests — expect same count as baseline**

```bash
npm test -- --run
```

Expected: same pass count. No test file imports App directly.

---

### Task 4: Update `DashboardPage.jsx`

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Replace the entire file content**

`src/pages/DashboardPage.jsx`:
```jsx
import Charts from '../components/Charts.jsx'
import HoldingsTable from '../components/HoldingsTable.jsx'
import SnapshotBar from '../components/SnapshotBar.jsx'

export default function DashboardPage({ portfolio }) {
  return (
    <>
      <Charts
        holdings={portfolio.effectiveHoldings}
        snaps={portfolio.snaps}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
      />
      <HoldingsTable
        holdings={portfolio.effectiveHoldings}
        rawHoldings={portfolio.holdings}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
        prices={portfolio.prices}
        priceLoading={portfolio.priceLoading}
        priceError={portfolio.priceError}
        lastUpdatedAt={portfolio.lastUpdatedAt}
        onRefresh={portfolio.onRefresh}
        onAdd={portfolio.addHolding}
        onDelete={portfolio.delHolding}
        onEdit={portfolio.editHolding}
      />
      <SnapshotBar onSnapshot={portfolio.takeSnapshot} onClear={portfolio.clearSnaps} />
      <footer>
        데이터는 이 브라우저에만 저장됩니다 · 투자 판단의 근거가 아닌 기록·시각화 용도입니다<br />
        Ledger v2 — live prices via Finnhub (US) · Yahoo Finance (KRX)
      </footer>
    </>
  )
}
```

- [ ] **Step 2: Run the full test suite — must match baseline count**

```bash
npm test -- --run
```

Expected: all tests pass, same count as Task 1. If any fail, compare the error to what was passing before — it indicates a prop name mismatch.

---

### Task 5: Final verification and commit

**Files:**
- Verify: `src/hooks/usePortfolio.js`, `src/App.jsx`, `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Confirm line counts match spec targets**

```bash
wc -l src/App.jsx src/hooks/usePortfolio.js
```

Expected:
- `App.jsx`: ~30 lines
- `usePortfolio.js`: ~80 lines

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePortfolio.js src/App.jsx src/pages/DashboardPage.jsx
git commit -m "refactor: extract usePortfolio hook, App becomes routing shell"
```
