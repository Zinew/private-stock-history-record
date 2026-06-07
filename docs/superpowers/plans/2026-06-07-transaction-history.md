# 거래 이력 기반 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 "보유 상태 스냅샷" 방식을 트랜잭션 이벤트 로그로 전환해 평균단가·실현손익을 자동 계산하고, JSON Export/Import로 데이터 백업 기능을 추가한다.

**Architecture:** `src/utils/transactions.js`에 순수 함수 3개(migrate, deriveHoldings, deriveRealizedGains)를 두고, `usePortfolio.js`가 이를 사용해 `ledger_transactions` localStorage에서 모든 상태를 도출한다. 기존 `ledger_holdings`는 최초 로드 시 자동 마이그레이션 후 삭제된다. 새 컴포넌트 2개(TransactionHistory, BackupBar)가 DashboardPage에 추가된다.

**Tech Stack:** React 18, Vite, localStorage, react-i18next, Vitest + @testing-library/react

---

## 파일 구조

| 파일 | 작업 |
|---|---|
| `src/utils/transactions.js` | 신규 — 순수 함수: migrate, deriveHoldings, deriveRealizedGains |
| `src/__tests__/transactions.test.js` | 신규 — 위 순수 함수 유닛 테스트 |
| `src/hooks/usePortfolio.js` | 전면 재작성 — 트랜잭션 기반, 마이그레이션 로직 포함 |
| `src/components/AddHoldingForm.jsx` | 수정 — 매수/매도 토글 + 날짜 피커 추가 |
| `src/components/HoldingsTable.jsx` | 수정 — `holdings` prop을 AddHoldingForm에 전달 |
| `src/components/EditModal.jsx` | 수정 — 수량·매수단가 필드 제거, 이름만 수정 |
| `src/components/TransactionHistory.jsx` | 신규 — 거래 이력 테이블 |
| `src/components/BackupBar.jsx` | 신규 — Export/Import 버튼 |
| `src/components/Header.jsx` | 수정 — 실현손익 항목 추가 |
| `src/pages/DashboardPage.jsx` | 수정 — 새 컴포넌트 연결, prop 갱신 |
| `src/locales/ko.json` | 수정 — tx.*, backup.*, header.realizedGain 키 추가 |
| `src/locales/en.json` | 수정 — 동일 |
| `src/index.css` | 수정 — 거래 이력 테이블, BackupBar 스타일 |

---

## Task 1: 순수 함수 — transactions.js

**Files:**
- Create: `src/utils/transactions.js`
- Create: `src/__tests__/transactions.test.js`

- [ ] **Step 1: 테스트 파일 작성 (실패 확인용)**

`src/__tests__/transactions.test.js` 전체:

```js
import { describe, it, expect } from 'vitest'
import {
  migrateHoldingsToTransactions,
  deriveHoldings,
  deriveRealizedGains,
} from '../utils/transactions.js'

describe('migrateHoldingsToTransactions', () => {
  it('converts each holding to a buy transaction with date: null', () => {
    const holdings = [
      { t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 180, currency: 'USD' },
      { t: '005930', nm: '삼성전자', q: 5, b: 75000, c: 82000, currency: 'KRW', exchange: 'KS' },
    ]
    const result = migrateHoldingsToTransactions(holdings)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'buy', ticker: 'AAPL', name: 'Apple',
      currency: 'USD', date: null, qty: 10, price: 150,
    })
    expect(result[0].id).toBeDefined()
    expect(result[1]).toMatchObject({
      type: 'buy', ticker: '005930', name: '삼성전자',
      currency: 'KRW', exchange: 'KS', date: null, qty: 5, price: 75000,
    })
  })
})

describe('deriveHoldings', () => {
  it('returns holding with correct qty and avg cost from single buy', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
    ]
    const result = deriveHoldings(txs)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ t: 'AAPL', nm: 'Apple', q: 10, b: 100, currency: 'USD' })
  })

  it('computes weighted average cost across multiple buys', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-02-01', qty: 10, price: 200 },
    ]
    const result = deriveHoldings(txs)
    expect(result[0].q).toBe(20)
    expect(result[0].b).toBeCloseTo(150, 5)
  })

  it('subtracts sell qty and adjusts totalCost proportionally', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-02-01', qty: 10, price: 200 },
      { id: '3', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-03-01', qty: 5, price: 250 },
    ]
    const result = deriveHoldings(txs)
    expect(result[0].q).toBe(15)
    expect(result[0].b).toBeCloseTo(150, 5)
  })

  it('filters out fully sold tickers', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 5, price: 100 },
      { id: '2', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-06-01', qty: 5, price: 200 },
    ]
    expect(deriveHoldings(txs)).toHaveLength(0)
  })

  it('handles multiple tickers independently', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 5, price: 100 },
      { id: '2', type: 'buy', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-01-02', qty: 3, price: 200 },
    ]
    const result = deriveHoldings(txs)
    expect(result).toHaveLength(2)
  })
})

describe('deriveRealizedGains', () => {
  it('returns empty array when no sell transactions', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
    ]
    expect(deriveRealizedGains(txs)).toHaveLength(0)
  })

  it('calculates gain using WAC: (sellPrice - avgCost) * qty', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-06-01', qty: 5, price: 200 },
    ]
    const gains = deriveRealizedGains(txs)
    expect(gains).toHaveLength(1)
    expect(gains[0].gain).toBeCloseTo(500, 5)
    expect(gains[0].avgCost).toBeCloseTo(100, 5)
    expect(gains[0].ticker).toBe('AAPL')
  })

  it('uses WAC across multiple buys before sell', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'buy', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-02-01', qty: 10, price: 200 },
      { id: '3', type: 'sell', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-03-01', qty: 10, price: 250 },
    ]
    const gains = deriveRealizedGains(txs)
    expect(gains[0].avgCost).toBeCloseTo(150, 5)
    expect(gains[0].gain).toBeCloseTo(1000, 5)
  })

  it('records a loss correctly', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 200 },
      { id: '2', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-06-01', qty: 10, price: 150 },
    ]
    const gains = deriveRealizedGains(txs)
    expect(gains[0].gain).toBeCloseTo(-500, 5)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/__tests__/transactions.test.js
```

Expected: FAIL (모듈 없음)

- [ ] **Step 3: `src/utils/transactions.js` 구현**

```js
export function migrateHoldingsToTransactions(holdings) {
  return holdings.map(h => {
    const tx = {
      id: crypto.randomUUID(),
      type: 'buy',
      ticker: h.t,
      name: h.nm ?? h.t,
      currency: h.currency ?? 'USD',
      date: null,
      qty: h.q,
      price: h.b ?? 0,
    }
    if (h.exchange) tx.exchange = h.exchange
    return tx
  })
}

export function deriveHoldings(transactions) {
  const map = {}
  const sorted = [...transactions].sort((a, b) => {
    if (!a.date) return -1
    if (!b.date) return 1
    return a.date.localeCompare(b.date)
  })
  for (const tx of sorted) {
    if (!map[tx.ticker]) {
      map[tx.ticker] = { ticker: tx.ticker, name: tx.name, currency: tx.currency, exchange: tx.exchange ?? null, qty: 0, totalCost: 0 }
    }
    if (tx.type === 'buy') {
      map[tx.ticker].qty += tx.qty
      map[tx.ticker].totalCost += tx.qty * tx.price
    } else {
      const avg = map[tx.ticker].qty > 0 ? map[tx.ticker].totalCost / map[tx.ticker].qty : 0
      map[tx.ticker].qty -= tx.qty
      map[tx.ticker].totalCost -= avg * tx.qty
    }
  }
  return Object.values(map)
    .filter(h => h.qty > 0.0001)
    .map(h => ({
      t: h.ticker,
      nm: h.name,
      q: h.qty,
      b: h.qty > 0 ? h.totalCost / h.qty : 0,
      currency: h.currency,
      ...(h.exchange ? { exchange: h.exchange } : {}),
    }))
}

export function deriveRealizedGains(transactions) {
  const avgCosts = {}
  const realized = []
  const sorted = [...transactions].sort((a, b) => {
    if (!a.date) return -1
    if (!b.date) return 1
    return a.date.localeCompare(b.date)
  })
  for (const tx of sorted) {
    if (!avgCosts[tx.ticker]) avgCosts[tx.ticker] = { qty: 0, totalCost: 0 }
    if (tx.type === 'buy') {
      avgCosts[tx.ticker].qty += tx.qty
      avgCosts[tx.ticker].totalCost += tx.qty * tx.price
    } else {
      const avgCost = avgCosts[tx.ticker].qty > 0
        ? avgCosts[tx.ticker].totalCost / avgCosts[tx.ticker].qty
        : 0
      realized.push({
        id: tx.id,
        ticker: tx.ticker,
        date: tx.date,
        qty: tx.qty,
        sellPrice: tx.price,
        avgCost,
        gain: (tx.price - avgCost) * tx.qty,
        currency: tx.currency,
      })
      avgCosts[tx.ticker].qty -= tx.qty
      avgCosts[tx.ticker].totalCost -= avgCost * tx.qty
    }
  }
  return realized
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/transactions.test.js
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/transactions.js src/__tests__/transactions.test.js
git commit -m "feat: add transaction pure functions (derive holdings, realized gains, migration)"
```

---

## Task 2: i18n 키 추가

**Files:**
- Modify: `src/locales/ko.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: `ko.json`에 키 추가**

`"charts"` 블록 다음에 아래 블록들을 추가:

```json
  "tx": {
    "buy": "매수",
    "sell": "매도",
    "date": "날짜",
    "qty": "수량",
    "price": "단가",
    "amount": "금액",
    "history": "거래 이력",
    "empty": "거래 이력이 없습니다",
    "unknownDate": "날짜 미상",
    "sellExceedsHolding": "보유 수량을 초과했습니다",
    "noHoldingsToSell": "매도할 보유 종목이 없습니다",
    "type": "구분"
  },
  "header": {
    "totalValue": "총 평가액",
    "totalCost": "총 매입액",
    "unrealizedPnl": "평가손익",
    "returnRate": "수익률",
    "justUpdated": "방금 업데이트",
    "realizedGain": "실현손익"
  },
  "backup": {
    "export": "내보내기",
    "import": "불러오기",
    "importConfirm": "현재 데이터가 모두 교체됩니다. 계속하시겠습니까?",
    "importSuccess": "데이터가 복원되었습니다",
    "importError": "올바른 백업 파일이 아닙니다"
  },
```

주의: `ko.json`에 이미 `"header"` 블록이 있으므로 기존 블록에 `"realizedGain"` 키만 추가하고, `"tx"` 와 `"backup"` 블록을 새로 추가한다.

기존 `"header"` 블록을 아래로 교체:
```json
  "header": {
    "totalValue": "총 평가액",
    "totalCost": "총 매입액",
    "unrealizedPnl": "평가손익",
    "returnRate": "수익률",
    "justUpdated": "방금 업데이트",
    "realizedGain": "실현손익"
  },
```

`"snapshot"` 블록 앞에 `"tx"` 블록 추가:
```json
  "tx": {
    "buy": "매수",
    "sell": "매도",
    "date": "날짜",
    "qty": "수량",
    "price": "단가",
    "amount": "금액",
    "history": "거래 이력",
    "empty": "거래 이력이 없습니다",
    "unknownDate": "날짜 미상",
    "sellExceedsHolding": "보유 수량을 초과했습니다",
    "noHoldingsToSell": "매도할 보유 종목이 없습니다",
    "type": "구분"
  },
```

`"dashboard"` 블록 다음에 `"backup"` 블록 추가:
```json
  "backup": {
    "export": "내보내기",
    "import": "불러오기",
    "importConfirm": "현재 데이터가 모두 교체됩니다. 계속하시겠습니까?",
    "importSuccess": "데이터가 복원되었습니다",
    "importError": "올바른 백업 파일이 아닙니다"
  }
```

- [ ] **Step 2: `en.json`에 동일 구조로 영어 키 추가**

기존 `"header"` 블록 교체:
```json
  "header": {
    "totalValue": "Total Value",
    "totalCost": "Total Cost",
    "unrealizedPnl": "Unrealized P&L",
    "returnRate": "Return",
    "justUpdated": "Just updated",
    "realizedGain": "Realized Gain"
  },
```

`"tx"` 블록 추가:
```json
  "tx": {
    "buy": "Buy",
    "sell": "Sell",
    "date": "Date",
    "qty": "Qty",
    "price": "Price",
    "amount": "Amount",
    "history": "Transaction History",
    "empty": "No transactions yet",
    "unknownDate": "Unknown date",
    "sellExceedsHolding": "Exceeds held quantity",
    "noHoldingsToSell": "No holdings to sell",
    "type": "Type"
  },
```

`"backup"` 블록 추가:
```json
  "backup": {
    "export": "Export",
    "import": "Import",
    "importConfirm": "This will replace all current data. Continue?",
    "importSuccess": "Data restored successfully",
    "importError": "Not a valid backup file"
  }
```

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
npx vitest run
```

Expected: 기존 테스트 모두 PASS (i18n 키는 런타임 로드이므로 기존 테스트에 영향 없음)

- [ ] **Step 4: 커밋**

```bash
git add src/locales/ko.json src/locales/en.json
git commit -m "feat: add tx, backup, header.realizedGain i18n keys"
```

---

## Task 3: usePortfolio.js 전면 재작성

**Files:**
- Modify: `src/hooks/usePortfolio.js`

현재 파일의 내용을 아래로 완전히 교체한다.

- [ ] **Step 1: `src/hooks/usePortfolio.js` 전체 교체**

```js
import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { useExchangeRate } from './useExchangeRate.js'
import { useStockPrices } from './useStockPrices.js'
import { useKrxPrices } from './useKrxPrices.js'
import { migrateHoldingsToTransactions, deriveHoldings, deriveRealizedGains } from '../utils/transactions.js'
import i18n from '../i18n.js'

function runMigrationIfNeeded() {
  if (localStorage.getItem('ledger_migration_v1')) return
  localStorage.setItem('ledger_migration_v1', '1')
  const rawHoldings = localStorage.getItem('ledger_holdings')
  if (!rawHoldings) return
  const holdings = JSON.parse(rawHoldings)
  if (!holdings.length) return
  const migrated = migrateHoldingsToTransactions(holdings)
  localStorage.setItem('ledger_transactions', JSON.stringify(migrated))
  localStorage.removeItem('ledger_holdings')
}

runMigrationIfNeeded()

export function usePortfolio() {
  const [transactions, setTransactions] = useLocalStorage('ledger_transactions', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const holdings = useMemo(() => deriveHoldings(transactions), [transactions])
  const realizedGains = useMemo(() => deriveRealizedGains(transactions), [transactions])

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
    c: prices[h.t] ?? 0,
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

  const totalRealizedGain = useMemo(
    () => realizedGains.reduce((s, g) => s + toDisplay(g.gain, g.currency), 0),
    [realizedGains, displayCurrency, exchangeRate.rate]
  )

  function addTransaction({ type, ticker, name, currency, exchange, date, qty, price }) {
    const tx = {
      id: crypto.randomUUID(),
      type,
      ticker: ticker.toUpperCase(),
      name,
      currency,
      date: date || null,
      qty,
      price,
    }
    if (exchange) tx.exchange = exchange
    setTransactions([...transactions, tx])
  }

  function deleteTransaction(id) {
    setTransactions(transactions.filter(tx => tx.id !== id))
  }

  function delHolding(i) {
    const ticker = holdings[i].t
    setTransactions(transactions.filter(tx => tx.ticker !== ticker))
  }

  function editHolding(i, patch) {
    if (!patch.nm) return
    const ticker = holdings[i].t
    setTransactions(transactions.map(tx =>
      tx.ticker === ticker ? { ...tx, name: patch.nm } : tx
    ))
  }

  function toggleCurrency() {
    if (!exchangeRate.rate) return
    setDisplayCurrency(prev => prev === 'USD' ? 'KRW' : 'USD')
  }

  function takeSnapshot() {
    if (holdings.length === 0) { alert(i18n.t('holdings.addFirst')); return }
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const next = [...snaps, { label, total: totalVal, currency: displayCurrency }]
    setSnaps(next.length > 60 ? next.slice(-60) : next)
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  function deleteSnap(index) {
    setSnaps(snaps.filter((_, i) => i !== index))
  }

  function restoreSnap(snap, index) {
    const next = [...snaps]
    next.splice(index, 0, snap)
    setSnaps(next)
  }

  return {
    transactions,
    holdings,
    effectiveHoldings,
    snaps,
    displayCurrency,
    exchangeRate,
    totalVal,
    totalCost,
    pl,
    ret,
    realizedGains,
    totalRealizedGain,
    toDisplay,
    prices,
    priceLoading,
    priceError,
    lastUpdatedAt,
    onRefresh: () => { refreshUsd(); refreshKrw() },
    addTransaction,
    deleteTransaction,
    delHolding,
    editHolding,
    toggleCurrency,
    takeSnapshot,
    clearSnaps,
    deleteSnap,
    restoreSnap,
  }
}
```

- [ ] **Step 2: 기존 usePortfolio 테스트 통과 확인**

기존 `src/__tests__/usePortfolio.test.js`는 `ledger_snaps` 기반 테스트만 있어 그대로 통과해야 한다.

```bash
npx vitest run src/__tests__/usePortfolio.test.js
```

Expected: 3개 테스트 PASS

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
npx vitest run
```

Expected: 모든 기존 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/usePortfolio.js
git commit -m "feat: refactor usePortfolio to transaction-based data model with auto-migration"
```

---

## Task 4: AddHoldingForm — 매수/매도 토글 + 날짜

**Files:**
- Modify: `src/components/AddHoldingForm.jsx`

현재 파일의 내용을 아래로 완전히 교체한다. 매수 폼은 기존 로직 유지, 매도 폼은 보유 종목 드롭다운 + 수량 + 단가로 단순화.

- [ ] **Step 1: `src/components/AddHoldingForm.jsx` 전체 교체**

```jsx
import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuote } from '../utils/finnhub.js'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../utils/stockSearch.js'

export default function AddHoldingForm({ onAddTransaction, holdings = [] }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)

  // 공통
  const [type, setType] = useState('buy')
  const [date, setDate] = useState(today)

  // 매수 전용
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
  const [tickerStatus, setTickerStatus] = useState('idle')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef(null)

  // 매도 전용
  const [sellTicker, setSellTicker] = useState('')
  const [sellQty, setSellQty] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellError, setSellError] = useState('')

  const isKRW = form.currency === 'KRW'

  // ──── 매수 핸들러 (기존 로직 그대로) ────

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
    setTickerStatus(prev => prev !== 'loading' ? prev : price !== null ? 'found' : 'error')
  }

  function handleNameChange(e) {
    const val = e.target.value
    setForm(f => ({ ...f, name: val, ticker: '', exchange: '', cur: '' }))
    setTickerStatus('idle')
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setSearchResults([]); setSearchOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const results = isKRW ? await fetchKrxSearch(val) : await fetchUsdSearch(val)
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
      if (price !== null) setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: String(price) })
    } else {
      setForm(f => ({ ...f, name: item.name, ticker: item.ticker, cur: '' }))
      setTickerStatus('loading')
      const price = await fetchQuote(item.ticker)
      setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: price !== null ? String(price) : '' })
      setTickerStatus(price !== null ? 'found' : 'error')
    }
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
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: form.currency, exchange: '' })
    setTickerStatus('idle')
    setSearchResults([])
    setSearchOpen(false)
    setDate(today)
  }

  // ──── 매도 핸들러 ────

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

  return (
    <div className="addbar">
      {/* 매수/매도 토글 */}
      <div className="field">
        <label>{t('tx.type')}</label>
        <div className="currency-toggle">
          <button
            className={`currency-btn ${type === 'buy' ? 'active' : ''}`}
            onClick={() => { setType('buy'); setSellError('') }}
          >{t('tx.buy')}</button>
          <button
            className={`currency-btn ${type === 'sell' ? 'active sell-btn' : ''}`}
            onClick={() => { setType('sell'); setSellError('') }}
          >{t('tx.sell')}</button>
        </div>
      </div>

      {/* 날짜 (공통) */}
      <div className="field">
        <label>{t('tx.date')}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {type === 'buy' ? (
        <>
          <div className="field tk">
            <label>{t('addHolding.ticker')}</label>
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
            <label>{t('addHolding.currency')}</label>
            <div className="currency-toggle">
              <button
                className={`currency-btn ${form.currency === 'USD' ? 'active' : ''}`}
                onClick={() => {
                  setForm(f => ({ ...f, currency: 'USD', exchange: '', ticker: '', name: '', cur: '' }))
                  setTickerStatus('idle'); setSearchOpen(false); setSearchResults([])
                }}
              >USD</button>
              <button
                className={`currency-btn ${form.currency === 'KRW' ? 'active' : ''}`}
                onClick={() => {
                  setForm(f => ({ ...f, currency: 'KRW', exchange: '', ticker: '', name: '', cur: '' }))
                  setTickerStatus('idle'); setSearchOpen(false); setSearchResults([])
                }}
              >KRW</button>
            </div>
          </div>
          <div className="field nm">
            <label>{t('addHolding.searchName')}</label>
            <input
              placeholder={isKRW ? t('addHolding.searchPlaceholderKRW') : 'Apple Inc.'}
              value={form.name}
              autoComplete="off"
              onChange={handleNameChange}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
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
            <label>{t('addHolding.qty')}</label>
            <input type="number" step="any" placeholder="10" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('addHolding.avgCost')}</label>
            <input type="number" step="any" placeholder={isKRW ? '75000' : '150'} value={form.buy} onChange={e => setForm(f => ({ ...f, buy: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('addHolding.currentPrice')}{tickerStatus === 'loading' ? ` ${t('addHolding.loading')}` : ''}</label>
            <input
              type="number" step="any" placeholder={isKRW ? '82000' : '190'}
              value={form.cur}
              readOnly={tickerStatus === 'found'}
              style={tickerStatus === 'found' ? { opacity: 0.7 } : {}}
              onChange={e => { if (tickerStatus !== 'found') setForm(f => ({ ...f, cur: e.target.value })) }}
            />
            {tickerStatus === 'error' && <span className="ticker-error">{t('addHolding.notFound')}</span>}
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

- [ ] **Step 2: 전체 테스트 통과 확인**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS (AddHoldingForm 관련 직접 테스트 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/components/AddHoldingForm.jsx
git commit -m "feat: add buy/sell toggle and date picker to AddHoldingForm"
```

---

## Task 5: EditModal — 이름만 수정

**Files:**
- Modify: `src/components/EditModal.jsx`

수량·매수단가·현재가 필드 제거, 이름 필드만 유지.

- [ ] **Step 1: `src/components/EditModal.jsx` 전체 교체**

```jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function EditModal({ holding, onSave, onClose }) {
  const [nm, setNm] = useState(holding.nm ?? '')
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSave() {
    onSave({ nm: nm.trim() })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{holding.t} {t('editModal.title')}</h3>
        <div className="modal-field">
          <label>{t('editModal.name')}</label>
          <input value={nm} onChange={e => setNm(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>{t('editModal.save')}</button>
          <button className="btn ghost" onClick={onClose}>{t('editModal.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: EditModal 테스트 업데이트**

`src/__tests__/components/EditModal.test.jsx`를 읽고, qty·avgCost 관련 테스트 케이스를 제거하거나 수정한다. 이름 수정 동작만 테스트하도록 갱신.

현재 `EditModal.test.jsx` 내용을 확인한 뒤 아래로 교체:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import EditModal from '../../components/EditModal.jsx'

const holding = { t: 'AAPL', nm: 'Apple Inc', q: 10, b: 150, c: 180, currency: 'USD' }

describe('EditModal', () => {
  it('renders holding ticker in title', () => {
    render(<EditModal holding={holding} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/AAPL/)).toBeTruthy()
  })

  it('calls onSave with updated name', () => {
    const onSave = vi.fn()
    render(<EditModal holding={holding} onSave={onSave} onClose={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Apple Inc Updated' } })
    fireEvent.click(screen.getByText(/저장|Save/i))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple Inc Updated' })
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn()
    render(<EditModal holding={holding} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByText(/취소|Cancel/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<EditModal holding={holding} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/components/EditModal.test.jsx
```

Expected: 4개 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/EditModal.jsx src/__tests__/components/EditModal.test.jsx
git commit -m "feat: simplify EditModal to name-only editing (qty/avg derived from transactions)"
```

---

## Task 6: TransactionHistory 컴포넌트 + CSS

**Files:**
- Create: `src/components/TransactionHistory.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: `src/components/TransactionHistory.jsx` 생성**

```jsx
import { useTranslation } from 'react-i18next'
import { fmtCurrency } from '../utils/format.js'

export default function TransactionHistory({ transactions, onDelete }) {
  const { t } = useTranslation()

  const sorted = [...transactions].sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })

  return (
    <div className="holdings tx-section">
      <h2 className="holdings-title">{t('tx.history')}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('tx.date')}</th>
              <th>{t('holdings.ticker')}</th>
              <th>{t('tx.type')}</th>
              <th>{t('tx.qty')}</th>
              <th>{t('tx.price')}</th>
              <th>{t('tx.amount')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={7} className="empty">{t('tx.empty')}</td></tr>
            ) : (
              sorted.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.date ?? <span className="tx-unknown-date">{t('tx.unknownDate')}</span>}</td>
                  <td>
                    <span className="tick">
                      {tx.ticker}
                      {tx.name && tx.name !== tx.ticker && <small>{tx.name}</small>}
                    </span>
                  </td>
                  <td>
                    <span className={`tx-type-badge ${tx.type}`}>
                      {t(`tx.${tx.type}`)}
                    </span>
                  </td>
                  <td>{tx.qty.toLocaleString()}</td>
                  <td>{fmtCurrency(tx.price, tx.currency)}</td>
                  <td>{fmtCurrency(tx.qty * tx.price, tx.currency)}</td>
                  <td>
                    <button className="del" onClick={() => onDelete(tx.id)} title={t('holdings.delete')}>✕</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `src/index.css` 맨 끝에 스타일 추가**

```css
/* Transaction History */
.tx-section { margin-top: 20px; }
.tx-type-badge { font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 600; }
.tx-type-badge.buy { background: rgba(63,191,143,.15); color: #3fbf8f; }
.tx-type-badge.sell { background: rgba(232,101,79,.15); color: #e8654f; }
.tx-unknown-date { color: var(--ink-faint); font-style: italic; }

/* AddHoldingForm sell mode */
.currency-btn.sell-btn.active { background: rgba(232,101,79,.15); color: #e8654f; border-color: #e8654f; }
.addbar select { background: var(--surface); color: var(--ink); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; font-family: inherit; font-size: 13px; width: 100%; }
```

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/TransactionHistory.jsx src/index.css
git commit -m "feat: add TransactionHistory component with buy/sell badge"
```

---

## Task 7: BackupBar 컴포넌트

**Files:**
- Create: `src/components/BackupBar.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: `src/components/BackupBar.jsx` 생성**

```jsx
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

const BACKUP_KEYS = [
  'ledger_transactions',
  'ledger_snaps',
  'ledger_manual_events',
  'ledger_display_currency',
  'i18nextLng',
]

export default function BackupBar() {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)

  function handleExport() {
    const data = {}
    for (const key of BACKUP_KEYS) {
      const val = localStorage.getItem(key)
      if (val !== null) {
        try { data[key] = JSON.parse(val) } catch { data[key] = val }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result)
        if (!data.ledger_transactions) {
          alert(t('backup.importError'))
          return
        }
        if (!window.confirm(t('backup.importConfirm'))) return
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
        alert(t('backup.importSuccess'))
        window.location.reload()
      } catch {
        alert(t('backup.importError'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="card backup-bar">
      <button className="btn ghost" onClick={handleExport}>{t('backup.export')}</button>
      <button className="btn ghost" onClick={() => fileInputRef.current?.click()}>{t('backup.import')}</button>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
    </div>
  )
}
```

- [ ] **Step 2: `src/index.css` 맨 끝에 BackupBar 스타일 추가**

```css
/* BackupBar */
.backup-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 0; }
```

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/BackupBar.jsx src/index.css
git commit -m "feat: add BackupBar with JSON export and import"
```

---

## Task 8: Header — 실현손익 추가

**Files:**
- Modify: `src/components/Header.jsx`

- [ ] **Step 1: `src/components/Header.jsx` 수정**

`Header` 컴포넌트에 `totalRealizedGain` prop 추가, 매도 거래가 있을 때만 표시.

기존 파일에서 함수 시그니처와 `<div className="summary">` 부분만 교체:

```jsx
export default function Header({ totalVal, totalCost, pl, ret, displayCurrency, onToggleCurrency, exchangeRate, onMenuOpen, totalRealizedGain, hasRealizedGains }) {
```

그리고 `<div className="summary">` 블록을:

```jsx
        <div className="summary">
          <div className="sum-item">
            <div className="label">{t('header.totalValue')}</div>
            <div className="val">{fmtCurrency(totalVal, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">{t('header.totalCost')}</div>
            <div className="val">{fmtCurrency(totalCost, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">{t('header.unrealizedPnl')}</div>
            <div className={`val ${pl >= 0 ? 'pos' : 'neg'}`}>
              {pl >= 0 ? '+' : ''}{fmtCurrency(pl, displayCurrency)}
            </div>
          </div>
          <div className="sum-item">
            <div className="label">{t('header.returnRate')}</div>
            <div className={`val ${ret >= 0 ? 'pos' : 'neg'}`}>{pct(ret)}</div>
          </div>
          {hasRealizedGains && (
            <div className="sum-item">
              <div className="label">{t('header.realizedGain')}</div>
              <div className={`val ${totalRealizedGain >= 0 ? 'pos' : 'neg'}`}>
                {totalRealizedGain >= 0 ? '+' : ''}{fmtCurrency(totalRealizedGain, displayCurrency)}
              </div>
            </div>
          )}
        </div>
```

- [ ] **Step 2: Header 테스트 확인**

```bash
npx vitest run src/__tests__/components/Header.test.jsx
```

Expected: 기존 테스트 PASS (새 prop은 optional이므로 기존 테스트에 영향 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/components/Header.jsx
git commit -m "feat: add realized gain to header (shown only when sell transactions exist)"
```

---

## Task 9: HoldingsTable + DashboardPage 연결

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/pages/DashboardPage.jsx`
- Modify: `src/App.jsx` (Header props 추가 확인)

- [ ] **Step 1: `HoldingsTable.jsx` — AddHoldingForm에 holdings 전달**

`HoldingsTable`의 `AddHoldingForm` 렌더링 부분을:

```jsx
<AddHoldingForm onAdd={onAdd} />
```

에서:

```jsx
<AddHoldingForm onAddTransaction={onAdd} holdings={rawHoldings} />
```

으로 교체. (`rawHoldings`는 이미 prop으로 전달되고 있음)

- [ ] **Step 2: `DashboardPage.jsx` 전체 교체**

```jsx
import Charts from '../components/Charts.jsx'
import HoldingsTable from '../components/HoldingsTable.jsx'
import SnapshotBar from '../components/SnapshotBar.jsx'
import TransactionHistory from '../components/TransactionHistory.jsx'
import BackupBar from '../components/BackupBar.jsx'
import { useTranslation } from 'react-i18next'

export default function DashboardPage({ portfolio }) {
  const { t } = useTranslation()
  return (
    <>
      <Charts
        holdings={portfolio.effectiveHoldings}
        snaps={portfolio.snaps}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
        onDeleteSnap={portfolio.deleteSnap}
        onRestoreSnap={portfolio.restoreSnap}
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
        onAdd={portfolio.addTransaction}
        onDelete={portfolio.delHolding}
        onEdit={portfolio.editHolding}
      />
      <SnapshotBar onSnapshot={portfolio.takeSnapshot} onClear={portfolio.clearSnaps} />
      <TransactionHistory
        transactions={portfolio.transactions}
        onDelete={portfolio.deleteTransaction}
      />
      <BackupBar />
      <footer>
        {t('dashboard.disclaimer')}<br />
        Ledger v2 — live prices via Finnhub (US) · Yahoo Finance (KRX)
      </footer>
    </>
  )
}
```

- [ ] **Step 3: `src/App.jsx` 확인 — Header에 realizedGain props 추가**

`App.jsx`에서 `<Header>` 컴포넌트를 렌더링하는 부분을 찾아 아래 두 prop을 추가:

```jsx
totalRealizedGain={portfolio.totalRealizedGain}
hasRealizedGains={portfolio.realizedGains.length > 0}
```

App.jsx의 현재 Header 렌더링이 어떻게 생겼는지 읽은 뒤 해당 prop을 추가한다.

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/HoldingsTable.jsx src/pages/DashboardPage.jsx src/App.jsx
git commit -m "feat: wire TransactionHistory, BackupBar, and realized gains into DashboardPage"
```

---

## 완료 후 수동 검증 체크리스트

브라우저에서 다음을 확인한다:

1. **마이그레이션**: 기존 보유 종목이 거래 이력 테이블에 "날짜 미상" 매수 행으로 표시되는지 확인
2. **매수 입력**: 새 매수 거래 입력 → 보유 종목 테이블에 반영, 거래 이력에 추가
3. **매도 입력**: 매도 거래 입력 → 보유 수량 감소, 실현손익 헤더에 표시
4. **매도 수량 초과**: 보유 수량보다 많은 수량으로 매도 시 에러 메시지
5. **거래 삭제**: ✕ 클릭 → 거래 이력에서 제거, 보유 종목 즉시 업데이트
6. **Export**: `ledger-backup-YYYY-MM-DD.json` 다운로드, 파일 내용에 `ledger_transactions` 포함
7. **Import**: 백업 파일 불러오기 → 확인 팝업 → 데이터 복원 → 페이지 새로고침
8. **언어 전환**: 한/영 전환 시 거래 이력 UI 텍스트 변경 확인
