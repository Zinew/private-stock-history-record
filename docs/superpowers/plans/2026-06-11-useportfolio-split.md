# usePortfolio 분해 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 215줄 `usePortfolio.js`를 하위 훅 4개 + 파사드로 분해한다. 반환 객체·동작·localStorage 키 변경 0.

**Architecture:** Task 1에서 자동 스냅샷(최대 위험 지점) 특성화 테스트를 **현재 코드로 먼저** 통과시켜 동작을 고정한다. Task 2에서 하위 훅 4개를 생성(아직 미사용), Task 3에서 파사드를 재작성해 연결한다. 자동 스냅샷 트리거 effect 2개와 평가액 계산은 파사드에 잔류(교차 의존이므로). 특성화 테스트 + 기존 217개 테스트의 무수정 통과가 회귀 기준.

**Tech Stack:** React hooks, Vitest (vi.hoisted + vi.mock으로 가격 훅 제어), @testing-library/react

**Spec:** `docs/superpowers/specs/2026-06-11-useportfolio-split-design.md`

---

### Task 1: 자동 스냅샷 특성화 테스트 (분해 전 — 현재 코드로 통과)

**Files:**
- Create: `src/__tests__/usePortfolioSnapshots.test.js`
- 프로덕션 코드 수정 금지. 테스트가 실패하면 현재 `src/hooks/usePortfolio.js`(149-161행의 effect 2개)의 실제 동작을 재추적해 테스트를 고친다. 실제 버그 판명 시 BLOCKED 보고.

- [ ] **Step 1: 테스트 파일 작성**

`src/__tests__/usePortfolioSnapshots.test.js` 생성:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// 가격 훅 2개를 제어 가능한 mock으로 교체 — 필드를 바꾸고 rerender하면 로딩 전환 시뮬레이션 가능.
// 리팩토링 후 usePortfolio가 useLivePrices를 경유해도 동일 모듈을 가로채므로 이 테스트는 무수정 유지된다.
const { mockUsd, mockKrw } = vi.hoisted(() => ({
  mockUsd: { prices: {}, loading: false, error: null, lastUpdatedAt: null, refresh: () => {} },
  mockKrw: { prices: {}, loading: false, error: null, lastUpdatedAt: null, refresh: () => {} },
}))

vi.mock('../hooks/useStockPrices.js', () => ({ useStockPrices: () => ({ ...mockUsd }) }))
vi.mock('../hooks/useKrxPrices.js', () => ({ useKrxPrices: () => ({ ...mockKrw }) }))

import { usePortfolio } from '../hooks/usePortfolio.js'

const BUY_AAPL = { id: 't1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2026-01-02', qty: 1, price: 100 }

function resetMocks() {
  mockUsd.prices = {}
  mockUsd.loading = false
  mockUsd.error = null
  mockKrw.prices = {}
  mockKrw.loading = false
  mockKrw.error = null
}

beforeEach(() => {
  localStorage.clear()
  resetMocks()
})

describe('usePortfolio — 자동 스냅샷 기록 (특성화)', () => {
  it('가격 로딩이 끝나는 순간 오늘 스냅샷을 기록한다', () => {
    localStorage.setItem('ledger_transactions', JSON.stringify([BUY_AAPL]))
    mockUsd.loading = true
    const { result, rerender } = renderHook(() => usePortfolio())
    expect(result.current.snaps).toEqual([])

    mockUsd.loading = false
    mockUsd.prices = { AAPL: 150 }
    rerender()

    expect(result.current.snaps).toHaveLength(1)
    expect(result.current.snaps[0].total).toBe(150) // 1주 × 현재가 150, 현금 0
    expect(result.current.snaps[0].date).toBe(new Date().toISOString().slice(0, 10))
    expect(result.current.snaps[0].currency).toBe('USD')
  })

  it('같은 날 다시 기록하면 추가가 아니라 갱신한다 (upsert)', () => {
    localStorage.setItem('ledger_transactions', JSON.stringify([BUY_AAPL]))
    mockUsd.loading = true
    const { result, rerender } = renderHook(() => usePortfolio())

    mockUsd.loading = false
    mockUsd.prices = { AAPL: 150 }
    rerender()
    expect(result.current.snaps).toHaveLength(1)
    expect(result.current.snaps[0].total).toBe(150)

    // 두 번째 로딩 사이클 (새로고침 시나리오)
    mockUsd.loading = true
    rerender()
    mockUsd.loading = false
    mockUsd.prices = { AAPL: 200 }
    rerender()

    expect(result.current.snaps).toHaveLength(1) // 여전히 1개
    expect(result.current.snaps[0].total).toBe(200) // total만 갱신
  })

  it('거래 추가 직후에도 스냅샷을 기록한다 (로딩 전환 없이)', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.snaps).toEqual([])

    act(() => {
      result.current.addTransaction({ type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2026-01-02', qty: 2, price: 100 })
    })

    expect(result.current.snaps).toHaveLength(1)
    expect(result.current.snaps[0].total).toBe(200) // 2주 × 매수가 폴백 100 (실시간 가격 없음)
  })

  it('보유 종목이 없으면 기록하지 않는다', () => {
    mockUsd.loading = true
    const { result, rerender } = renderHook(() => usePortfolio())

    mockUsd.loading = false
    rerender()

    expect(result.current.snaps).toEqual([])
  })
})
```

- [ ] **Step 2: 현재 코드로 통과 확인**

Run: `npx vitest run src/__tests__/usePortfolioSnapshots.test.js`
Expected: 4 tests PASS — 현재 동작을 고정하는 특성화 테스트이므로 프로덕션 무수정으로 통과해야 한다. 실패 시 effect 타이밍(렌더 횟수)을 재추적해 rerender 횟수만 조정.

- [ ] **Step 3: 전체 테스트 + 커밋**

Run: `npm test` → Expected: 221 PASS (217 + 4)

```bash
git add src/__tests__/usePortfolioSnapshots.test.js
git commit -m "test: 자동 스냅샷 특성화 테스트 — usePortfolio 분해 전 동작 고정"
```

---

### Task 2: 하위 훅 4개 생성 (아직 미연결)

**Files:**
- Create: `src/hooks/useTransactions.js`
- Create: `src/hooks/useDisplayCurrency.js`
- Create: `src/hooks/useLivePrices.js`
- Create: `src/hooks/useSnapshots.js`
- `src/hooks/usePortfolio.js`는 이 Task에서 건드리지 않는다 (Task 3에서 연결)

각 파일의 로직은 현재 `src/hooks/usePortfolio.js`의 해당 블록을 그대로 이전한 것이다 (`git show HEAD:src/hooks/usePortfolio.js`로 대조 가능).

- [ ] **Step 1: useTransactions.js 작성** (현 8-24행 마이그레이션 + 27, 36-37, 93-130행 이전)

```js
import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { migrateHoldingsToTransactions, deriveHoldings, deriveRealizedGains } from '../utils/transactions.js'

// 일회성 마이그레이션: 구버전 ledger_holdings → ledger_transactions (usePortfolio에서 이동, import 시 1회 실행)
function runMigrationIfNeeded() {
  if (localStorage.getItem('ledger_migration_v1')) return
  localStorage.setItem('ledger_migration_v1', '1')
  const rawHoldings = localStorage.getItem('ledger_holdings')
  if (!rawHoldings) return
  try {
    const holdings = JSON.parse(rawHoldings)
    if (!holdings.length) return
    const migrated = migrateHoldingsToTransactions(holdings)
    localStorage.setItem('ledger_transactions', JSON.stringify(migrated))
    localStorage.removeItem('ledger_holdings')
  } catch {
    localStorage.removeItem('ledger_holdings')
  }
}

runMigrationIfNeeded()

// 거래 원장 훅 — ledger_transactions 저장과 보유종목/실현손익 파생을 소유.
// 스냅샷 트리거(snapAfterTx)는 모름 — 그 신호는 usePortfolio가 addTransaction을 래핑해 처리
export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage('ledger_transactions', [])

  const holdings = useMemo(() => deriveHoldings(transactions), [transactions])
  const realizedGains = useMemo(() => deriveRealizedGains(transactions), [transactions])

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

  function editTransaction(id, patch) {
    setTransactions(transactions.map(tx =>
      tx.id === id ? { ...tx, ...patch } : tx
    ))
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

  return { transactions, holdings, realizedGains, addTransaction, deleteTransaction, editTransaction, delHolding, editHolding }
}
```

- [ ] **Step 2: useDisplayCurrency.js 작성** (현 29-30, 34, 57, 64-69, 163-166행 이전)

```js
import { useLocalStorage } from './useLocalStorage.js'
import { useExchangeRate } from './useExchangeRate.js'

// 표시 통화·환율 훅 — 환율이 없으면 USD로 폴백, toDisplay로 금액 환산
export function useDisplayCurrency() {
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const displayCurrency = exchangeRate.rate ? displayCurrencyRaw : 'USD'

  function toDisplay(amount, fromCurrency) {
    if (!exchangeRate.rate || fromCurrency === displayCurrency) return amount
    return displayCurrency === 'KRW'
      ? amount * exchangeRate.rate
      : amount / exchangeRate.rate
  }

  function toggleCurrency() {
    if (!exchangeRate.rate) return
    setDisplayCurrency(prev => prev === 'USD' ? 'KRW' : 'USD')
  }

  return { displayCurrency, exchangeRate, toDisplay, toggleCurrency }
}
```

- [ ] **Step 3: useLivePrices.js 작성** (현 39-55, 59-62행 이전)

```js
import { useMemo } from 'react'
import { useStockPrices } from './useStockPrices.js'
import { useKrxPrices } from './useKrxPrices.js'

// 실시간 가격 조합 훅 — USD/KRW 보유종목을 나눠 조회하고 병합, 현재가 폴백(매수가) 적용
export function useLivePrices(holdings) {
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

  const effectiveHoldings = useMemo(
    () => holdings.map(h => ({ ...h, c: prices[h.t] ?? h.b ?? 0 })),
    [holdings, prices]
  )

  function refresh() { refreshUsd(); refreshKrw() }

  return { prices, priceLoading, priceError, lastUpdatedAt, refresh, effectiveHoldings }
}
```

- [ ] **Step 4: useSnapshots.js 작성** (현 28, 132-147, 168-180행 이전)

```js
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage.js'

// 자산 추이 스냅샷 훅 — 하루 1개 upsert, 최대 60개 유지.
// 자동 기록 트리거(가격 로딩 완료·거래 직후)는 usePortfolio가 소유하고 upsertTodaySnap을 호출한다.
// holdings 유무 가드는 호출자(usePortfolio effect)가 담당 — 여기는 total > 0만 확인
export function useSnapshots() {
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])

  const upsertTodaySnap = useCallback((total, currency) => {
    if (!(total > 0)) return
    const today = new Date().toISOString().slice(0, 10)
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    setSnaps(prev => {
      const idx = prev.findIndex(s => s.date === today)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], total, currency }
        return next
      }
      const next = [...prev, { label, total, currency, date: today }]
      return next.length > 60 ? next.slice(-60) : next
    })
  }, [setSnaps])

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

  return { snaps, upsertTodaySnap, clearSnaps, deleteSnap, restoreSnap }
}
```

참고: 원본 `upsertTodaySnap`의 `holdings.length === 0` 가드는 호출자(파사드 effect)에 이미 중복으로 존재하므로 여기서는 제거한다 — 모든 호출 경로에서 동작 동일 (스펙 참조). useCallback 의존성은 `[holdings.length]` → `[setSnaps]`로 바뀌지만, 파사드 effect들이 데이터 의존성(totalVal 등)으로 재실행되고 upsert는 멱등이므로 동작 차이 없음 — Task 1의 특성화 테스트가 이를 검증한다.

- [ ] **Step 5: 테스트·빌드 확인 (새 파일은 아직 미사용 — 깨질 게 없어야 정상)**

Run: `npm test` → Expected: 221 PASS
Run: `npm run build` → Expected: 성공

- [ ] **Step 6: 커밋**

```bash
git add src/hooks/useTransactions.js src/hooks/useDisplayCurrency.js src/hooks/useLivePrices.js src/hooks/useSnapshots.js
git commit -m "refactor: usePortfolio 하위 훅 4개 추출 (미연결)"
```

---

### Task 3: 파사드 재작성 + 전체 검증

**Files:**
- Modify: `src/hooks/usePortfolio.js` (215줄 → 전체 교체, ~95줄)
- Test: `src/__tests__/usePortfolio.test.js`, `src/__tests__/usePortfolioSnapshots.test.js` (**둘 다 수정 금지**)

- [ ] **Step 1: usePortfolio.js 전체 교체**

```js
import { useMemo, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { useTransactions } from './useTransactions.js'
import { useDisplayCurrency } from './useDisplayCurrency.js'
import { useLivePrices } from './useLivePrices.js'
import { useSnapshots } from './useSnapshots.js'

// 포트폴리오 파사드 — 하위 훅 4개를 조합하고, 교차 의존인 평가액 계산과
// 자동 스냅샷 트리거(가격 로딩 완료 시점 + 거래 직후)를 소유한다
export function usePortfolio() {
  const tx = useTransactions()
  const { displayCurrency, exchangeRate, toDisplay, toggleCurrency } = useDisplayCurrency()
  const live = useLivePrices(tx.holdings)
  const snap = useSnapshots()

  const [cash, setCash] = useLocalStorage('ledger_cash', 0)
  const [targetWeights, setTargetWeightsRaw] = useLocalStorage('ledger_target_weights', {})

  const { holdings, realizedGains } = tx
  const { effectiveHoldings, priceLoading } = live

  const prevPriceLoading = useRef(false)
  const snapAfterTx = useRef(false)

  const holdingsVal = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
  const totalVal = holdingsVal + (Number(cash) || 0)
  const totalCost = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
  const pl = holdingsVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0

  const totalRealizedGain = useMemo(
    () => realizedGains.reduce((s, g) => s + toDisplay(g.gain, g.currency), 0),
    [realizedGains, displayCurrency, exchangeRate.rate]
  )

  function setTargetWeight(ticker, pct) {
    setTargetWeightsRaw(prev => {
      if (pct == null) {
        const next = { ...prev }
        delete next[ticker]
        return next
      }
      return { ...prev, [ticker]: Number(pct) }
    })
  }

  // 거래 추가를 래핑해 스냅샷 트리거 신호를 세팅 (useTransactions는 스냅샷을 모름)
  function addTransaction(args) {
    tx.addTransaction(args)
    snapAfterTx.current = true
  }

  // 자동 스냅샷 1: 가격 로딩이 끝나는 순간 기록
  useEffect(() => {
    if (prevPriceLoading.current && !priceLoading && holdings.length > 0 && totalVal > 0) {
      snap.upsertTodaySnap(totalVal, displayCurrency)
    }
    prevPriceLoading.current = priceLoading
  }, [priceLoading, totalVal, holdings.length, displayCurrency, snap.upsertTodaySnap])

  // 자동 스냅샷 2: 거래 직후 기록
  useEffect(() => {
    if (snapAfterTx.current && holdings.length > 0 && totalVal > 0) {
      snap.upsertTodaySnap(totalVal, displayCurrency)
      snapAfterTx.current = false
    }
  }, [totalVal, holdings.length, displayCurrency, snap.upsertTodaySnap])

  return {
    transactions: tx.transactions,
    holdings,
    effectiveHoldings,
    snaps: snap.snaps,
    displayCurrency,
    exchangeRate,
    cash,
    setCash,
    targetWeights,
    setTargetWeight,
    totalVal,
    totalCost,
    pl,
    ret,
    realizedGains,
    totalRealizedGain,
    toDisplay,
    prices: live.prices,
    priceLoading,
    priceError: live.priceError,
    lastUpdatedAt: live.lastUpdatedAt,
    onRefresh: live.refresh,
    addTransaction,
    deleteTransaction: tx.deleteTransaction,
    editTransaction: tx.editTransaction,
    delHolding: tx.delHolding,
    editHolding: tx.editHolding,
    toggleCurrency,
    clearSnaps: snap.clearSnaps,
    deleteSnap: snap.deleteSnap,
    restoreSnap: snap.restoreSnap,
  }
}
```

원본 대비 변경 요약 (리뷰 참고용): 마이그레이션→useTransactions로 이동, 저장소 6개 중 4개가 하위 훅으로 이동(cash/targetWeights만 잔류), 가격 조합→useLivePrices, 스냅샷 저장·연산→useSnapshots. **effect 2개의 조건·deps 구조와 반환 객체의 키 31개는 원본과 동일** (`git show <Task1 커밋>:src/hooks/usePortfolio.js` 대조).

- [ ] **Step 2: 특성화 + 기존 테스트 무수정 통과 확인**

Run: `npx vitest run src/__tests__/usePortfolioSnapshots.test.js src/__tests__/usePortfolio.test.js`
Expected: 14 PASS (특성화 4 + 기존 10). 실패 시 파사드와 원본의 effect 조건·계산식을 비교 — 테스트 수정 금지.

- [ ] **Step 3: 전체 테스트 + 빌드**

Run: `npm test` → Expected: 221 PASS
Run: `npm run build` → Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/usePortfolio.js
git commit -m "refactor: usePortfolio를 파사드로 재작성 — 하위 훅 4개 연결"
```

---

### Task 4: 육안 검증 (사용자 확인)

**Files:** 없음 (검증만)

- [ ] **Step 1: dev 서버 확인** (이미 떠 있으면 재사용, 아니면 `npm run dev`)

- [ ] **Step 2: 사용자 육안 확인 요청**

- 대시보드: 평가액·손익·수익률 표시, 실시간 가격 로딩(● 표시), 자산 추이 차트
- 거래 추가 → 보유 종목 반영 + 추이 차트에 오늘 포인트 생성/갱신
- 통화 전환(USD↔KRW) 정상
- 거래 이력 삭제/수정 정상

- [ ] **Step 3: 이상 발견 시**

`git show <Task1 커밋>:src/hooks/usePortfolio.js`(원본)와 비교해 누락 로직 확인 후 수정, 테스트 재실행, 사용자 재확인 후 커밋.
