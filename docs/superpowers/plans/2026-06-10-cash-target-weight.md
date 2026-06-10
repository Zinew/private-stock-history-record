# 현금 포지션 + 목표 비중 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포트폴리오에 현금 포지션을 추가하고, 종목별 목표 비중 설정 및 리밸런싱 가이드를 제공한다.

**Architecture:** `src/utils/rebalancing.js` 순수 함수로 리밸런싱 계산 분리. `usePortfolio`에 `cash`/`targetWeights` localStorage 상태 추가. `EditModal`에 목표 비중 필드 + 현금 모드 추가. `HoldingsTable`에 목표(%) 열, CASH 행, 리밸런싱 요약 카드 추가.

**Tech Stack:** React, Vitest + Testing Library, react-i18next, localStorage

**Spec:** `docs/superpowers/specs/2026-06-10-cash-target-weight-design.md`

---

## 파일 구조

| 파일 | 작업 |
|------|------|
| `src/utils/rebalancing.js` | 신규 — 리밸런싱 계산 순수 함수 |
| `src/__tests__/utils/rebalancing.test.js` | 신규 — rebalancing 유닛 테스트 |
| `src/hooks/usePortfolio.js` | 수정 — cash, targetWeights 상태 추가 |
| `src/__tests__/usePortfolio.test.js` | 수정 — cash/targetWeights 테스트 추가 |
| `src/locales/ko.json` | 수정 — 신규 i18n 키 |
| `src/locales/en.json` | 수정 — 신규 i18n 키 |
| `src/components/EditModal.jsx` | 수정 — 목표 비중 필드 + 현금 모드 |
| `src/__tests__/components/EditModal.test.jsx` | 수정 — 기존 테스트 업데이트 + 신규 추가 |
| `src/components/HoldingsTable.jsx` | 수정 — 목표(%) 열, CASH 행, 리밸런싱 카드 |
| `src/__tests__/components/HoldingsTable.test.jsx` | 수정 — CASH 행, 목표(%) 열, 리밸런싱 카드 테스트 |
| `src/index.css` | 수정 — CASH 행 스타일, 리밸런싱 카드 스타일, weight-hint |
| `src/pages/DashboardPage.jsx` | 수정 — HoldingsTable에 신규 prop 전달 |

---

## Task 1: rebalancing.js 유틸 함수 + 테스트

**Files:**
- Create: `src/utils/rebalancing.js`
- Create: `src/__tests__/utils/rebalancing.test.js`

- [ ] **Step 1: 실패 테스트 작성**

`src/__tests__/utils/rebalancing.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeRebalancing, totalTargetWeight } from '../../utils/rebalancing.js'

describe('computeRebalancing', () => {
  const rows = [
    { t: 'AAPL', nm: 'Apple', displayVal: 1000 },
    { t: 'SCHD', nm: 'SCHD', displayVal: 500 },
    { t: 'cash', nm: 'CASH', displayVal: 500 },
  ]
  const totalVal = 2000

  it('returns [] when totalVal is 0', () => {
    expect(computeRebalancing(rows, { AAPL: 50 }, 0)).toEqual([])
  })

  it('computes currentPct from displayVal / totalVal', () => {
    const result = computeRebalancing(rows, { AAPL: 40 }, totalVal)
    expect(result[0].currentPct).toBeCloseTo(50)
  })

  it('assigns sell action when target < current', () => {
    const result = computeRebalancing(rows, { AAPL: 40 }, totalVal)
    expect(result[0].action).toBe('sell')
    expect(result[0].diffPct).toBeCloseTo(-10)
  })

  it('assigns buy action when target > current', () => {
    const result = computeRebalancing(rows, { SCHD: 30 }, totalVal)
    expect(result[0].action).toBe('buy')
  })

  it('assigns hold_cash when cash target > current', () => {
    const result = computeRebalancing(rows, { cash: 30 }, totalVal)
    expect(result[0].action).toBe('hold_cash')
  })

  it('assigns use_cash when cash target < current', () => {
    const cashRows = [{ t: 'cash', nm: 'CASH', displayVal: 800 }]
    const result = computeRebalancing(cashRows, { cash: 20 }, 1000)
    expect(result[0].action).toBe('use_cash')
  })

  it('assigns hold when diffPct < 0.01', () => {
    const result = computeRebalancing(rows, { AAPL: 50 }, totalVal)
    expect(result[0].action).toBe('hold')
  })

  it('computes amount as abs(diffPct/100 * totalVal)', () => {
    const result = computeRebalancing(rows, { AAPL: 40 }, totalVal)
    expect(result[0].amount).toBeCloseTo(200)
  })

  it('excludes rows with no targetWeight entry', () => {
    const result = computeRebalancing(rows, { AAPL: 50 }, totalVal)
    expect(result).toHaveLength(1)
    expect(result[0].ticker).toBe('AAPL')
  })
})

describe('totalTargetWeight', () => {
  it('sums all weight values', () => {
    expect(totalTargetWeight({ AAPL: 40, cash: 30 })).toBe(70)
  })

  it('returns 0 for empty object', () => {
    expect(totalTargetWeight({})).toBe(0)
  })

  it('ignores null values', () => {
    expect(totalTargetWeight({ AAPL: 40, SCHD: null })).toBe(40)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```
npx vitest run src/__tests__/utils/rebalancing.test.js
```
Expected: FAIL (파일 없음)

- [ ] **Step 3: rebalancing.js 구현**

`src/utils/rebalancing.js`:

```js
/**
 * @param {Array<{t: string, nm: string, displayVal: number}>} allRows
 * @param {Object<string, number>} targetWeights
 * @param {number} totalVal
 * @returns {Array<{ticker, nm, currentPct, targetPct, diffPct, action, amount}>}
 */
export function computeRebalancing(allRows, targetWeights, totalVal) {
  if (!totalVal || totalVal <= 0) return []
  return allRows
    .filter(row => targetWeights[row.t] != null)
    .map(row => {
      const currentPct = (row.displayVal / totalVal) * 100
      const targetPct = targetWeights[row.t]
      const diffPct = targetPct - currentPct
      const amount = Math.abs(diffPct / 100 * totalVal)
      const isCash = row.t === 'cash'
      let action
      if (Math.abs(diffPct) < 0.01) action = 'hold'
      else if (isCash) action = diffPct > 0 ? 'hold_cash' : 'use_cash'
      else action = diffPct > 0 ? 'buy' : 'sell'
      return { ticker: row.t, nm: row.nm, currentPct, targetPct, diffPct, action, amount }
    })
}

export function totalTargetWeight(targetWeights) {
  return Object.values(targetWeights).reduce((s, v) => s + (Number(v) || 0), 0)
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
npx vitest run src/__tests__/utils/rebalancing.test.js
```
Expected: PASS (12 tests)

- [ ] **Step 5: 커밋**

```
git add src/utils/rebalancing.js src/__tests__/utils/rebalancing.test.js
git commit -m "feat: add rebalancing utility functions"
```

---

## Task 2: usePortfolio — cash + targetWeights 상태 추가

**Files:**
- Modify: `src/hooks/usePortfolio.js`
- Modify: `src/__tests__/usePortfolio.test.js`

**배경:** `usePortfolio.js` 현재 `ledger_transactions`, `ledger_snaps`, `ledger_display_currency`, `ledger_exchange_rate` 를 localStorage로 관리한다. cash와 targetWeights를 같은 패턴으로 추가한다. `totalVal`은 `holdingsVal + cash`로 변경하고, `pl`은 stock 기준으로 유지한다.

- [ ] **Step 1: 실패 테스트 작성**

`src/__tests__/usePortfolio.test.js` 파일 끝에 추가:

```js
describe('cash', () => {
  it('initializes cash to 0', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.cash).toBe(0)
  })

  it('setCash updates cash value', () => {
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setCash(500000) })
    expect(result.current.cash).toBe(500000)
  })

  it('cash is included in totalVal', () => {
    localStorage.setItem('ledger_cash', '1000')
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.totalVal).toBe(1000)
  })
})

describe('targetWeights', () => {
  it('initializes targetWeights to empty object', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.targetWeights).toEqual({})
  })

  it('setTargetWeight stores weight for ticker', () => {
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setTargetWeight('AAPL', 40) })
    expect(result.current.targetWeights['AAPL']).toBe(40)
  })

  it('setTargetWeight with null removes ticker', () => {
    localStorage.setItem('ledger_target_weights', JSON.stringify({ AAPL: 40 }))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setTargetWeight('AAPL', null) })
    expect(result.current.targetWeights['AAPL']).toBeUndefined()
  })

  it('setTargetWeight preserves other tickers', () => {
    localStorage.setItem('ledger_target_weights', JSON.stringify({ AAPL: 40, SCHD: 20 }))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setTargetWeight('AAPL', 35) })
    expect(result.current.targetWeights['SCHD']).toBe(20)
    expect(result.current.targetWeights['AAPL']).toBe(35)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```
npx vitest run src/__tests__/usePortfolio.test.js
```
Expected: FAIL (cash, targetWeights 없음)

- [ ] **Step 3: usePortfolio.js 수정**

`src/hooks/usePortfolio.js` 에서 다음 두 줄을:

```js
  const [transactions, setTransactions] = useLocalStorage('ledger_transactions', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })
```

를 다음으로 교체:

```js
  const [transactions, setTransactions] = useLocalStorage('ledger_transactions', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })
  const [cash, setCash] = useLocalStorage('ledger_cash', 0)
  const [targetWeights, setTargetWeightsRaw] = useLocalStorage('ledger_target_weights', {})
```

그 다음, `totalVal` 계산 부분을 찾아서:

```js
  const totalVal = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
  const totalCost = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
  const pl = totalVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0
```

를 다음으로 교체:

```js
  const holdingsVal = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
  const totalVal = holdingsVal + (Number(cash) || 0)
  const totalCost = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
  const pl = holdingsVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0
```

그 다음, `function addTransaction` 바로 위에 `setTargetWeight` 함수 추가:

```js
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
```

마지막으로 `return` 블록에 신규 항목 추가:

```js
  return {
    transactions,
    holdings,
    effectiveHoldings,
    snaps,
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
    prices,
    priceLoading,
    priceError,
    lastUpdatedAt,
    onRefresh: () => { refreshUsd(); refreshKrw() },
    addTransaction,
    deleteTransaction,
    editTransaction,
    delHolding,
    editHolding,
    toggleCurrency,
    clearSnaps,
    deleteSnap,
    restoreSnap,
  }
```

- [ ] **Step 4: 테스트 통과 확인**

```
npx vitest run src/__tests__/usePortfolio.test.js
```
Expected: PASS (기존 + 신규 포함 전체 통과)

- [ ] **Step 5: 전체 테스트 확인**

```
npx vitest run
```
Expected: 전체 PASS (기존 테스트 회귀 없음)

- [ ] **Step 6: 커밋**

```
git add src/hooks/usePortfolio.js src/__tests__/usePortfolio.test.js
git commit -m "feat: add cash and targetWeights state to usePortfolio"
```

---

## Task 3: i18n 키 추가

**Files:**
- Modify: `src/locales/ko.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: ko.json 수정**

`src/locales/ko.json`의 `"holdings"` 섹션 끝 `"emptyDesc"` 항목 뒤에 추가:

```json
    "targetWeight": "목표(%)",
    "cash": "현금",
    "rebalancingGuide": "리밸런싱 가이드",
    "targetTotal": "목표 합계",
    "unassigned": "미설정",
    "buy": "매수",
    "sell": "매도",
    "hold_cash": "현금 보유",
    "use_cash": "현금 사용",
    "hold": "유지"
```

`"editModal"` 섹션 끝 `"validationError"` 항목 뒤에 추가:

```json
    "targetWeight": "목표 비중(%)",
    "cashBalance": "현금 잔액",
    "weightRemaining": "{{remaining}}% 남음",
    "weightExceeds100": "합계 {{total}}% — 100% 초과"
```

- [ ] **Step 2: en.json 수정**

`src/locales/en.json`의 `"holdings"` 섹션 끝 `"emptyDesc"` 항목 뒤에 추가:

```json
    "targetWeight": "Target(%)",
    "cash": "Cash",
    "rebalancingGuide": "Rebalancing Guide",
    "targetTotal": "Target total",
    "unassigned": "unassigned",
    "buy": "Buy",
    "sell": "Sell",
    "hold_cash": "Hold cash",
    "use_cash": "Use cash",
    "hold": "Hold"
```

`"editModal"` 섹션 끝 `"validationError"` 항목 뒤에 추가:

```json
    "targetWeight": "Target Weight(%)",
    "cashBalance": "Cash Balance",
    "weightRemaining": "{{remaining}}% remaining",
    "weightExceeds100": "Total {{total}}% — exceeds 100%"
```

- [ ] **Step 3: JSON 유효성 확인**

```
node -e "require('./src/locales/ko.json'); require('./src/locales/en.json'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 4: 커밋**

```
git add src/locales/ko.json src/locales/en.json
git commit -m "feat: add i18n keys for cash position and target weight"
```

---

## Task 4: EditModal — 목표 비중 필드 + 현금 모드

**Files:**
- Modify: `src/components/EditModal.jsx`
- Modify: `src/__tests__/components/EditModal.test.jsx`

**배경:** 현재 EditModal은 `{ holding, onSave, onClose }` 만 받는다. `onSave({ nm })` 으로 이름만 저장. 확장 후 `onSave({ nm, tw })` (일반 모드) 또는 `onSave({ cashAmount, tw })` (현금 모드) 를 저장. 기존 테스트가 `onSave({ nm: '...' })` 를 기대하므로 `tw: null` 포함으로 업데이트 필요.

- [ ] **Step 1: 기존 테스트를 새 시그니처에 맞게 업데이트**

`src/__tests__/components/EditModal.test.jsx` 에서 다음 두 테스트를 수정:

```js
  it('calls onSave with updated name only', () => {
    const onSave = vi.fn()
    renderModal({ onSave })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Apple Inc Updated' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple Inc Updated', tw: null })
  })

  it('trims whitespace from name before saving', () => {
    const onSave = vi.fn()
    renderModal({ onSave })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Apple  ' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple', tw: null })
  })
```

파일 끝에 신규 테스트 추가:

```js
describe('EditModal 목표 비중 필드', () => {
  it('renders target weight input', () => {
    renderModal({ targetWeight: 30, otherWeightsTotal: 60 })
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('shows remaining weight hint when total <= 100', () => {
    renderModal({ targetWeight: 30, otherWeightsTotal: 50 })
    expect(screen.getByText(/남음/)).toBeTruthy()
  })

  it('shows exceeds warning when total > 100', () => {
    renderModal({ targetWeight: 80, otherWeightsTotal: 60 })
    expect(screen.getByText(/초과/)).toBeTruthy()
  })

  it('saves tw value with onSave', () => {
    const onSave = vi.fn()
    renderModal({ onSave, targetWeight: '', otherWeightsTotal: 0 })
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '40' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tw: 40 }))
  })
})

describe('EditModal 현금 모드', () => {
  function renderCashModal(overrides = {}) {
    const props = {
      holding: { t: 'CASH', nm: '현금' },
      onSave: vi.fn(),
      onClose: vi.fn(),
      cashMode: true,
      cashAmount: 500000,
      targetWeight: 20,
      otherWeightsTotal: 70,
      ...overrides,
    }
    return { ...render(<I18nextProvider i18n={i18n}><EditModal {...props} /></I18nextProvider>), ...props }
  }

  it('renders cash balance input in cash mode', () => {
    renderCashModal()
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.some(i => i.value === '500000')).toBeTruthy()
  })

  it('calls onSave with cashAmount and tw in cash mode', () => {
    const onSave = vi.fn()
    renderCashModal({ onSave })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ cashAmount: 500000, tw: 20 })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```
npx vitest run src/__tests__/components/EditModal.test.jsx
```
Expected: 일부 FAIL (새 테스트 실패, 기존 tw:null 불일치)

- [ ] **Step 3: EditModal.jsx 구현**

`src/components/EditModal.jsx` 전체를 다음으로 교체:

```jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function EditModal({
  holding,
  onSave,
  onClose,
  cashMode = false,
  cashAmount = 0,
  targetWeight = '',
  otherWeightsTotal = 0,
}) {
  const [nm, setNm] = useState(holding.nm ?? '')
  const [tw, setTw] = useState(targetWeight !== '' && targetWeight != null ? String(targetWeight) : '')
  const [cashAmt, setCashAmt] = useState(String(cashAmount))
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const twNum = tw === '' ? 0 : Number(tw)
  const total = otherWeightsTotal + twNum
  const remaining = 100 - total
  const exceeds = total > 100

  function handleSave() {
    const patch = {}
    if (cashMode) patch.cashAmount = Number(cashAmt) || 0
    else patch.nm = nm.trim()
    patch.tw = tw === '' ? null : Number(tw)
    onSave(patch)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{holding.t} {t('editModal.title')}</h3>
        {cashMode ? (
          <div className="modal-field">
            <label>{t('editModal.cashBalance')}</label>
            <input
              type="number"
              min="0"
              value={cashAmt}
              onChange={e => setCashAmt(e.target.value)}
            />
          </div>
        ) : (
          <div className="modal-field">
            <label>{t('editModal.name')}</label>
            <input value={nm} onChange={e => setNm(e.target.value)} />
          </div>
        )}
        <div className="modal-field">
          <label>{t('editModal.targetWeight')}</label>
          <div className="modal-field-row">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tw}
              onChange={e => setTw(e.target.value)}
              placeholder="0"
            />
            <span className={`weight-hint${exceeds ? ' weight-exceeds' : ''}`}>
              {exceeds
                ? t('editModal.weightExceeds100', { total: total.toFixed(1) })
                : t('editModal.weightRemaining', { remaining: remaining.toFixed(1) })
              }
            </span>
          </div>
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

- [ ] **Step 4: 테스트 통과 확인**

```
npx vitest run src/__tests__/components/EditModal.test.jsx
```
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```
git add src/components/EditModal.jsx src/__tests__/components/EditModal.test.jsx
git commit -m "feat: add target weight and cash mode to EditModal"
```

---

## Task 5: HoldingsTable 확장 + CSS

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/index.css`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

**배경:** HoldingsTable 현재 9열. 목표(%) 열 추가 → 10열. CASH 행 추가 (항상 표시). 리밸런싱 카드 table-scroll 하단에 추가. 모바일 카드뷰에 목표(%) stat + CASH 카드 추가. `computeRebalancing`을 import해서 리밸런싱 카드 데이터 계산. 

- [ ] **Step 1: 신규 테스트 작성**

`src/__tests__/components/HoldingsTable.test.jsx` 파일 끝 (닫는 `}` 전)에 추가:

```js
describe('HoldingsTable CASH 행', () => {
  const cashProps = {
    ...defaultProps,
    holdings: mockHoldings,
    rawHoldings: mockHoldings,
    totalVal: 2000,
    cash: 100,
    onSetCash: vi.fn(),
    targetWeights: {},
    onSetTargetWeight: vi.fn(),
  }

  it('always renders CASH row', () => {
    renderHoldingsTable(cashProps)
    expect(screen.getAllByText('CASH').length).toBeGreaterThanOrEqual(1)
  })

  it('renders cash amount in CASH row', () => {
    renderHoldingsTable(cashProps)
    expect(screen.getByText('$100.00')).toBeTruthy()
  })

  it('renders edit button in CASH row', () => {
    renderHoldingsTable(cashProps)
    const editBtns = screen.getAllByTitle('수정')
    expect(editBtns.length).toBeGreaterThanOrEqual(2)
  })
})

describe('HoldingsTable 목표(%) 열', () => {
  it('shows target weight when set', () => {
    renderHoldingsTable({
      ...defaultProps,
      holdings: mockHoldings,
      rawHoldings: mockHoldings,
      totalVal: 1900,
      targetWeights: { AAPL: 50 },
      onSetTargetWeight: vi.fn(),
    })
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1)
  })

  it('shows — when target weight not set', () => {
    renderHoldingsTable({
      ...defaultProps,
      holdings: mockHoldings,
      rawHoldings: mockHoldings,
      totalVal: 1900,
      targetWeights: {},
      onSetTargetWeight: vi.fn(),
    })
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })
})

describe('HoldingsTable 리밸런싱 카드', () => {
  it('hides rebalancing card when no target weights set', () => {
    renderHoldingsTable({
      ...defaultProps,
      holdings: mockHoldings,
      totalVal: 1900,
      targetWeights: {},
      onSetTargetWeight: vi.fn(),
    })
    expect(screen.queryByText('리밸런싱 가이드')).toBeNull()
  })

  it('shows rebalancing card when at least one target weight set', () => {
    renderHoldingsTable({
      ...defaultProps,
      holdings: mockHoldings,
      rawHoldings: mockHoldings,
      totalVal: 1900,
      cash: 0,
      targetWeights: { AAPL: 50 },
      onSetTargetWeight: vi.fn(),
    })
    expect(screen.getByText('리밸런싱 가이드')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```
npx vitest run src/__tests__/components/HoldingsTable.test.jsx
```
Expected: 신규 테스트 FAIL

- [ ] **Step 3: HoldingsTable.jsx 수정 — import 및 props**

파일 상단 import 수정:

```jsx
import { useState, useRef, useMemo } from 'react'
import EditModal from './EditModal.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import { fmtCurrency, pctArrow, fmtArrow } from '../utils/format.js'
import { computeRebalancing, totalTargetWeight } from '../utils/rebalancing.js'
import { useTranslation } from 'react-i18next'
```

함수 시그니처 수정:

```jsx
export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},
  cash = 0, onSetCash = () => {}, targetWeights = {}, onSetTargetWeight = () => {},
}) {
```

`const [editingIndex, setEditingIndex] = useState(null)` 아래에 추가:

```jsx
  const [cashEditing, setCashEditing] = useState(false)
```

`dispSym` 정의 아래에 추가:

```jsx
  const rebalancingRows = useMemo(() => {
    if (Object.keys(targetWeights).length === 0 || totalVal <= 0) return []
    const allRows = [
      ...holdings.map(h => ({
        t: h.t,
        nm: h.nm || h.t,
        displayVal: toDisplay(h.q * h.c, h.currency ?? 'USD'),
      })),
      { t: 'cash', nm: t('holdings.cash'), displayVal: Number(cash) || 0 },
    ]
    return computeRebalancing(allRows, targetWeights, totalVal)
  }, [holdings, cash, targetWeights, totalVal, toDisplay, t])

  function getOtherWeightsTotal(ticker) {
    return Object.entries(targetWeights)
      .filter(([k]) => k !== ticker)
      .reduce((s, [, v]) => s + (Number(v) || 0), 0)
  }
```

- [ ] **Step 4: HoldingsTable.jsx 수정 — 테이블 헤더**

테이블 `<thead>` 의 `<tr>` 을 다음으로 교체 (`colSpan={9}` → `colSpan={10}`, 목표(%) 열 추가):

```jsx
            <tr>
              <th>{t('holdings.ticker')}</th><th>{t('holdings.qty')}</th><th>{t('holdings.avgCost')}</th><th>{t('holdings.currentPrice')}</th>
              <th>{t('holdings.value')} ({dispSym})</th><th>{t('holdings.pnl')} ({dispSym})</th><th>{t('holdings.returnRate')}</th><th>{t('holdings.weight')}</th><th>{t('holdings.targetWeight')}</th><th></th>
            </tr>
```

빈 상태 `<td colSpan={9}>` 를 `<td colSpan={10}>` 으로 변경.

- [ ] **Step 5: HoldingsTable.jsx 수정 — 종목 행에 목표(%) 열 + CASH 행**

`holdings.map` 내 `</tr>` 바로 전, `<td>` (편집/삭제 버튼) 앞에 다음을 추가:

```jsx
                    <td>{targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}</td>
```

기존 `holdings.map(...)` 닫는 `)` 바로 뒤 (tbody 안, `</tbody>` 전) 에 CASH 행 추가:

```jsx
            <tr className="cash-row">
              <td><span className="tick">CASH<small>{t('holdings.cash')}</small></span></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>{fmtCurrency(Number(cash) || 0, displayCurrency)}</td>
              <td>—</td>
              <td>—</td>
              <td>{totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%</td>
              <td>{targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}</td>
              <td>
                <button className="edit" onClick={() => setCashEditing(true)} title={t('holdings.edit')}>✎</button>
              </td>
            </tr>
```

- [ ] **Step 6: HoldingsTable.jsx 수정 — 리밸런싱 카드**

`</div>` (table-scroll 닫는 태그) 바로 뒤에 리밸런싱 카드 추가:

```jsx
      {rebalancingRows.length > 0 && (
        <div className="rebalancing-card">
          <h3 className="rebalancing-title">{t('holdings.rebalancingGuide')}</h3>
          <table className="rebalancing-table">
            <thead>
              <tr>
                <th>{t('holdings.ticker')}</th>
                <th>{t('holdings.weight')}</th>
                <th>{t('holdings.targetWeight')}</th>
                <th>±%</th>
                <th>{t('holdings.value')} ({dispSym})</th>
              </tr>
            </thead>
            <tbody>
              {rebalancingRows.map(row => (
                <tr key={row.ticker}>
                  <td>{row.nm || row.ticker}</td>
                  <td>{row.currentPct.toFixed(1)}%</td>
                  <td>{row.targetPct.toFixed(1)}%</td>
                  <td className={row.diffPct >= 0 ? 'pos' : 'neg'}>
                    {row.diffPct >= 0 ? '+' : ''}{row.diffPct.toFixed(1)}%
                  </td>
                  <td>
                    <span className={`rebal-action rebal-action--${row.action}`}>
                      {t(`holdings.${row.action}`)}
                    </span>
                    {row.action !== 'hold' && ` ${fmtCurrency(row.amount, displayCurrency)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(() => {
            const total = totalTargetWeight(targetWeights)
            if (Math.abs(total - 100) < 0.01) return null
            return (
              <p className="rebalancing-hint">
                {t('holdings.targetTotal')}: {total.toFixed(1)}%
                {total < 100 && ` — ${(100 - total).toFixed(1)}% ${t('holdings.unassigned')}`}
              </p>
            )
          })()}
        </div>
      )}
```

- [ ] **Step 7: HoldingsTable.jsx 수정 — 모바일 카드 + CASH 카드**

모바일 카드뷰 `.holding-card-stats` 내 마지막 `<div>` (비중) 뒤에 목표(%) 추가:

```jsx
                <div>
                  <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
                  <div className="holding-card-stat-val">
                    {targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}
                  </div>
                </div>
```

모바일 `holdings.map(...)` 닫는 `})}` 뒤에 CASH 카드 추가:

```jsx
        <div className="holding-card cash-card">
          <div className="holding-card-header">
            <div>
              <div className="holding-card-name">{t('holdings.cash')}</div>
              <div className="holding-card-sub">CASH</div>
            </div>
            <div>
              <div className="holding-card-val">{fmtCurrency(Number(cash) || 0, displayCurrency)}</div>
            </div>
          </div>
          <div className="holding-card-stats">
            <div>
              <div className="holding-card-stat-label">{t('holdings.weight')}</div>
              <div className="holding-card-stat-val">
                {totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
            <div>
              <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
              <div className="holding-card-stat-val">
                {targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}
              </div>
            </div>
          </div>
          <div className="holding-card-actions">
            <button className="edit" onClick={() => setCashEditing(true)} title={t('holdings.edit')}>✎</button>
          </div>
        </div>
```

- [ ] **Step 8: HoldingsTable.jsx 수정 — EditModal 호출 업데이트**

기존 `{editingIndex !== null && (<EditModal .../>)}` 를 다음으로 교체:

```jsx
      {editingIndex !== null && (
        <EditModal
          holding={rawHoldings[editingIndex]}
          targetWeight={targetWeights[rawHoldings[editingIndex]?.t] != null ? targetWeights[rawHoldings[editingIndex]?.t] : ''}
          otherWeightsTotal={getOtherWeightsTotal(rawHoldings[editingIndex]?.t)}
          onSave={patch => {
            onEdit(editingIndex, { nm: patch.nm })
            onSetTargetWeight(rawHoldings[editingIndex].t, patch.tw)
            setEditingIndex(null)
          }}
          onClose={() => setEditingIndex(null)}
        />
      )}
      {cashEditing && (
        <EditModal
          holding={{ t: 'CASH', nm: t('holdings.cash') }}
          cashMode
          cashAmount={Number(cash) || 0}
          targetWeight={targetWeights['cash'] != null ? targetWeights['cash'] : ''}
          otherWeightsTotal={getOtherWeightsTotal('cash')}
          onSave={patch => {
            onSetCash(patch.cashAmount)
            onSetTargetWeight('cash', patch.tw)
            setCashEditing(false)
          }}
          onClose={() => setCashEditing(false)}
        />
      )}
```

- [ ] **Step 9: index.css 스타일 추가**

`src/index.css` 파일 끝 (모바일 CSS 블록 앞 또는 뒤)에 다음을 추가:

```css
/* Cash row */
.cash-row {
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid var(--line);
}
.cash-row td {
  color: var(--ink-dim);
}

/* Rebalancing card */
.rebalancing-card {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
  overflow-x: auto;
}
.rebalancing-title {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 0 0 12px;
}
.rebalancing-table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;
}
.rebalancing-table th,
.rebalancing-table td {
  padding: 6px 10px;
  text-align: right;
}
.rebalancing-table th:first-child,
.rebalancing-table td:first-child {
  text-align: left;
}
.rebalancing-table thead tr {
  border-bottom: 1px solid var(--line);
}
.rebalancing-table th {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--ink-faint);
  font-weight: 400;
}
.rebal-action { font-weight: 500; }
.rebal-action--buy { color: var(--gain); }
.rebal-action--sell { color: var(--loss); }
.rebal-action--hold_cash { color: #60a5fa; }
.rebal-action--use_cash { color: #f59e0b; }
.rebal-action--hold { color: var(--ink-faint); }
.rebalancing-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--ink-faint);
}

/* EditModal target weight */
.modal-field-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.modal-field-row input {
  flex: 1;
}
.weight-hint {
  font-size: 11px;
  color: var(--ink-faint);
  white-space: nowrap;
}
.weight-exceeds {
  color: var(--loss);
}

/* Mobile card: 2x2 for 4 stats */
@media (max-width: 640px) {
  .holding-card-stats {
    grid-template-columns: 1fr 1fr;
  }
}
```

- [ ] **Step 10: 테스트 통과 확인**

```
npx vitest run src/__tests__/components/HoldingsTable.test.jsx
```
Expected: PASS (기존 + 신규 전체)

- [ ] **Step 11: 전체 테스트 확인**

```
npx vitest run
```
Expected: 전체 PASS

- [ ] **Step 12: 커밋**

```
git add src/components/HoldingsTable.jsx src/index.css src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: add target weight column, cash row, and rebalancing card to HoldingsTable"
```

---

## Task 6: DashboardPage — prop 연결

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

**배경:** DashboardPage는 `portfolio` 객체를 받아서 각 컴포넌트에 전달한다. `portfolio.cash`, `portfolio.setCash`, `portfolio.targetWeights`, `portfolio.setTargetWeight` 를 HoldingsTable에 추가 전달한다.

- [ ] **Step 1: DashboardPage.jsx 수정**

`src/pages/DashboardPage.jsx` 에서 `<HoldingsTable` 의 props 목록에 다음 4줄 추가:

```jsx
        cash={portfolio.cash}
        onSetCash={portfolio.setCash}
        targetWeights={portfolio.targetWeights}
        onSetTargetWeight={portfolio.setTargetWeight}
```

전체 HoldingsTable 호출은 다음과 같아야 한다:

```jsx
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
        cash={portfolio.cash}
        onSetCash={portfolio.setCash}
        targetWeights={portfolio.targetWeights}
        onSetTargetWeight={portfolio.setTargetWeight}
      />
```

- [ ] **Step 2: 전체 테스트 최종 확인**

```
npx vitest run
```
Expected: 전체 PASS

- [ ] **Step 3: 커밋**

```
git add src/pages/DashboardPage.jsx
git commit -m "feat: wire cash and targetWeights props in DashboardPage"
```

---

## 완료 기준

- [ ] `npx vitest run` — 전체 PASS (기존 회귀 없음)
- [ ] `node -e "require('./src/locales/ko.json')"` — JSON 에러 없음
- [ ] 개발 서버에서 보유종목 ✎ 클릭 → 목표 비중 필드 표시
- [ ] 보유종목 ✎ 클릭 → 목표 비중 입력 후 저장 → 테이블에 X% 표시
- [ ] CASH ✎ 클릭 → 현금 잔액 + 목표 비중 입력 후 저장
- [ ] 목표 비중 1개 이상 설정 → 리밸런싱 카드 표시
- [ ] 목표 비중 0개 → 리밸런싱 카드 숨김
- [ ] 합계 100% 초과 입력 → 경고 표시
