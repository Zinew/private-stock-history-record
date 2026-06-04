# Multi-Currency Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** USD와 KRW 종목을 함께 관리하고, 헤더 토글로 표시 통화를 전환하며, 환율은 frankfurter.app에서 자동 조회한다.

**Architecture:** 각 holding에 `currency` 필드 추가, App.jsx에 `displayCurrency`/`exchangeRate` 상태와 `toDisplay()` 헬퍼 추가. 컴포넌트들은 props로 displayCurrency와 toDisplay를 받아 렌더링.

**Tech Stack:** Vite, React, frankfurter.app API (무료, 키 불필요)

---

## 파일 구조

```
수정:
  src/utils/format.js           ← fmtKRW, fmtCurrency 추가
  src/index.css                 ← .currency-toggle, .currency-btn 스타일 추가
  src/App.jsx                   ← displayCurrency, exchangeRate 상태, toDisplay(), toggleCurrency()
  src/components/Header.jsx     ← 토글 버튼 + 환율 표시, 새 props
  src/components/HoldingsTable.jsx ← 폼에 통화 토글, 행 표시 업데이트
  src/components/Charts.jsx     ← snaps 통화 필터링, Y축 포맷 업데이트

생성:
  src/hooks/useExchangeRate.js  ← frankfurter.app fetch + 캐시

테스트 수정:
  src/__tests__/format.test.js              ← fmtKRW, fmtCurrency 테스트 추가
  src/__tests__/components/Header.test.jsx  ← 새 props 반영
  src/__tests__/components/HoldingsTable.test.jsx ← currency 필드 포함
```

---

## Task 1: format.js — fmtKRW + fmtCurrency

**Files:**
- Modify: `src/utils/format.js`
- Modify: `src/__tests__/format.test.js`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/__tests__/format.test.js` 끝에 추가:

```js
import { describe, it, expect } from 'vitest'
import { fmt, pct, fmtKRW, fmtCurrency } from '../utils/format.js'

// 기존 fmt, pct 테스트는 그대로 유지

describe('fmtKRW', () => {
  it('양수를 ₩X,XXX,XXX 형식으로 변환', () => {
    expect(fmtKRW(1234567)).toBe('₩1,234,567')
  })
  it('0을 ₩0으로 변환', () => {
    expect(fmtKRW(0)).toBe('₩0')
  })
  it('음수를 -₩X,XXX 형식으로 변환', () => {
    expect(fmtKRW(-50000)).toBe('-₩50,000')
  })
  it('소수점은 반올림해서 정수로 표시', () => {
    expect(fmtKRW(1234.7)).toBe('₩1,235')
  })
})

describe('fmtCurrency', () => {
  it('USD는 fmt로 위임', () => {
    expect(fmtCurrency(100, 'USD')).toBe('$100.00')
  })
  it('KRW는 fmtKRW로 위임', () => {
    expect(fmtCurrency(100000, 'KRW')).toBe('₩100,000')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
cd D:\BEBIG\livenow
npm test
```

Expected: `fmtKRW is not a function`, `fmtCurrency is not a function`

- [ ] **Step 3: format.js 구현**

`src/utils/format.js` 전체를 다음으로 교체:

```js
export const fmt = n =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const pct = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'

export const fmtKRW = n =>
  (n < 0 ? '-' : '') + '₩' + Math.abs(n).toLocaleString('ko-KR', { maximumFractionDigits: 0 })

export const fmtCurrency = (n, currency) =>
  currency === 'KRW' ? fmtKRW(n) : fmt(n)
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
npm test
```

Expected: 모든 테스트 pass (기존 6 + 새 6 = 12개 이상)

- [ ] **Step 5: 커밋**

```powershell
cd D:\BEBIG\livenow
git add src/utils/format.js src/__tests__/format.test.js
git commit -m "feat: add fmtKRW and fmtCurrency"
```

---

## Task 2: CSS — currency toggle 스타일

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: index.css 끝에 스타일 추가**

`src/index.css` 파일 끝 `footer { ... }` 블록 다음에 추가:

```css
.currency-toggle {
  display: flex;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.currency-btn {
  background: transparent;
  border: none;
  color: var(--ink-faint);
  cursor: pointer;
  padding: 5px 12px;
  font-family: 'Spline Sans Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  transition: .15s;
}
.currency-btn.active {
  background: var(--accent);
  color: #0c0e0d;
  font-weight: 600;
}
.rate-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rate-label {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  color: var(--ink-faint);
}
```

- [ ] **Step 2: 빌드 확인**

```powershell
cd D:\BEBIG\livenow
npm run build
```

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```powershell
git add src/index.css
git commit -m "style: add currency toggle CSS"
```

---

## Task 3: useExchangeRate 훅

**Files:**
- Create: `src/hooks/useExchangeRate.js`

(frankfurter.app fetch는 외부 네트워크 의존이라 단위 테스트 대신 빌드 + 타입 확인으로 검증)

- [ ] **Step 1: useExchangeRate.js 생성**

`src/hooks/useExchangeRate.js`:

```js
import { useEffect } from 'react'

export function useExchangeRate(setExchangeRate) {
  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=USD&to=KRW')
      .then(r => r.json())
      .then(data => {
        setExchangeRate({
          rate: data.rates.KRW,
          updatedAt: new Date().toISOString(),
        })
      })
      .catch(() => {
        // 실패 시 localStorage 캐시 유지 — setExchangeRate 호출 안 함
      })
  }, [])
}
```

- [ ] **Step 2: 빌드 확인**

```powershell
cd D:\BEBIG\livenow
npm run build
```

Expected: 빌드 성공, 오류 없음

- [ ] **Step 3: 커밋**

```powershell
git add src/hooks/useExchangeRate.js
git commit -m "feat: add useExchangeRate hook"
```

---

## Task 4: App.jsx — displayCurrency, exchangeRate, toDisplay

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: App.jsx 전체를 다음으로 교체**

```jsx
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useExchangeRate } from './hooks/useExchangeRate.js'
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

  // 환율 없으면 KRW 표시 불가 → USD 강제
  const effectiveDisplayCurrency = exchangeRate.rate ? displayCurrency : 'USD'

  function toDisplay(amount, fromCurrency) {
    if (!exchangeRate.rate || fromCurrency === effectiveDisplayCurrency) return amount
    return effectiveDisplayCurrency === 'KRW'
      ? amount * exchangeRate.rate
      : amount / exchangeRate.rate
  }

  const totalVal = holdings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
  const totalCost = holdings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
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
        holdings={holdings}
        snaps={snaps}
        totalVal={totalVal}
        displayCurrency={effectiveDisplayCurrency}
        toDisplay={toDisplay}
      />
      <HoldingsTable
        holdings={holdings}
        totalVal={totalVal}
        onAdd={addHolding}
        onDelete={delHolding}
        displayCurrency={effectiveDisplayCurrency}
        toDisplay={toDisplay}
      />
      <SnapshotBar onSnapshot={takeSnapshot} onClear={clearSnaps} />
      <footer>
        데이터는 이 브라우저에만 저장됩니다 · 투자 판단의 근거가 아닌 기록·시각화 용도입니다<br />
        Ledger v1 — manual entry edition
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: 기존 테스트 통과 확인**

```powershell
cd D:\BEBIG\livenow
npm test
```

Expected: 기존 테스트 모두 pass (App 자체 테스트 없으므로 수치 변동 없음)

- [ ] **Step 3: 빌드 확인**

```powershell
npm run build
```

Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```powershell
git add src/App.jsx
git commit -m "feat: add displayCurrency, exchangeRate and toDisplay to App"
```

---

## Task 5: Header.jsx — 토글 버튼 + 환율 표시

**Files:**
- Modify: `src/components/Header.jsx`
- Modify: `src/__tests__/components/Header.test.jsx`

- [ ] **Step 1: 테스트 업데이트**

`src/__tests__/components/Header.test.jsx` 전체를 다음으로 교체:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../../components/Header.jsx'

const defaultProps = {
  totalVal: 0,
  totalCost: 0,
  pl: 0,
  ret: 0,
  displayCurrency: 'USD',
  onToggleCurrency: vi.fn(),
  exchangeRate: { rate: null, updatedAt: null },
}

describe('Header', () => {
  it('브랜드 이름 Ledger 표시', () => {
    render(<Header {...defaultProps} />)
    expect(screen.getByText(/Ledger/)).toBeInTheDocument()
  })

  it('총 평가액 표시 (USD)', () => {
    render(<Header {...defaultProps} totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    expect(screen.getByText('$12,450.00')).toBeInTheDocument()
  })

  it('총 평가액 표시 (KRW)', () => {
    render(<Header {...defaultProps} totalVal={17000000} totalCost={10000000} pl={7000000} ret={70} displayCurrency="KRW" />)
    expect(screen.getByText('₩17,000,000')).toBeInTheDocument()
  })

  it('양수 손익에 pos 클래스 적용', () => {
    render(<Header {...defaultProps} totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    expect(screen.getByText('+$2,450.00')).toHaveClass('pos')
  })

  it('음수 손익에 neg 클래스 적용', () => {
    render(<Header {...defaultProps} totalVal={8000} totalCost={10000} pl={-2000} ret={-20} />)
    expect(screen.getByText('-$2,000.00')).toHaveClass('neg')
  })

  it('환율 있으면 토글 버튼 표시', () => {
    render(<Header {...defaultProps} exchangeRate={{ rate: 1380, updatedAt: new Date().toISOString() }} />)
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('KRW')).toBeInTheDocument()
  })

  it('환율 없으면 토글 버튼 숨김', () => {
    render(<Header {...defaultProps} exchangeRate={{ rate: null, updatedAt: null }} />)
    expect(screen.queryByText('KRW')).not.toBeInTheDocument()
  })

  it('토글 클릭 시 onToggleCurrency 호출', () => {
    const onToggle = vi.fn()
    render(<Header {...defaultProps} exchangeRate={{ rate: 1380, updatedAt: new Date().toISOString() }} onToggleCurrency={onToggle} />)
    fireEvent.click(screen.getByText('KRW'))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
cd D:\BEBIG\livenow
npm test -- --reporter=verbose 2>&1 | Select-String -Pattern "Header"
```

Expected: 새 테스트 일부 실패 (KRW 포맷, 토글 관련)

- [ ] **Step 3: Header.jsx 전체 교체**

```jsx
import { fmt, fmtCurrency, pct } from '../utils/format.js'

function formatUpdatedAt(isoString) {
  if (!isoString) return ''
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (mins < 1) return '방금 업데이트'
  if (mins < 60) return `${mins}분 전`
  return `${Math.floor(mins / 60)}시간 전`
}

export default function Header({ totalVal, totalCost, pl, ret, displayCurrency, onToggleCurrency, exchangeRate }) {
  const hasRate = !!exchangeRate.rate
  const sym = displayCurrency === 'KRW' ? '₩' : '$'

  return (
    <header>
      <div className="brand">
        <h1>Ledger<span className="dot">.</span></h1>
        <span className="tag">portfolio tracker · v1</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {hasRate && (
          <div className="rate-bar">
            <div className="currency-toggle">
              <button
                className={`currency-btn ${displayCurrency === 'USD' ? 'active' : ''}`}
                onClick={onToggleCurrency}
              >USD</button>
              <button
                className={`currency-btn ${displayCurrency === 'KRW' ? 'active' : ''}`}
                onClick={onToggleCurrency}
              >KRW</button>
            </div>
            <span className="rate-label">
              1 USD = ₩{exchangeRate.rate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} · {formatUpdatedAt(exchangeRate.updatedAt)}
            </span>
          </div>
        )}
        <div className="summary">
          <div className="sum-item">
            <div className="label">총 평가액</div>
            <div className="val">{fmtCurrency(totalVal, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">총 매입액</div>
            <div className="val">{fmtCurrency(totalCost, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">평가손익</div>
            <div className={`val ${pl >= 0 ? 'pos' : 'neg'}`}>
              {pl >= 0 ? '+' : ''}{fmtCurrency(pl, displayCurrency)}
            </div>
          </div>
          <div className="sum-item">
            <div className="label">수익률</div>
            <div className={`val ${ret >= 0 ? 'pos' : 'neg'}`}>{pct(ret)}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
npm test
```

Expected: 모든 테스트 pass

- [ ] **Step 5: 커밋**

```powershell
git add src/components/Header.jsx src/__tests__/components/Header.test.jsx
git commit -m "feat: add currency toggle and exchange rate to Header"
```

---

## Task 6: HoldingsTable.jsx — 통화 선택 + 행 표시

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

- [ ] **Step 1: 테스트 업데이트**

`src/__tests__/components/HoldingsTable.test.jsx` 전체 교체:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HoldingsTable from '../../components/HoldingsTable.jsx'

const mockHoldings = [
  { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190, currency: 'USD' },
]
const identity = (n) => n  // toDisplay mock: no conversion

describe('HoldingsTable', () => {
  it('종목 없을 때 빈 안내 메시지 표시', () => {
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={vi.fn()} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    expect(screen.getByText(/종목이 없습니다/)).toBeInTheDocument()
  })

  it('종목 티커 표시', () => {
    render(<HoldingsTable holdings={mockHoldings} totalVal={1900} onAdd={vi.fn()} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 onDelete 호출', () => {
    const onDelete = vi.fn()
    render(<HoldingsTable holdings={mockHoldings} totalVal={1900} onAdd={vi.fn()} onDelete={onDelete} displayCurrency="USD" toDisplay={identity} />)
    fireEvent.click(screen.getByTitle('삭제'))
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('폼 입력 후 추가 버튼 클릭 시 onAdd에 currency 포함', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={onAdd} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: 'TSLA' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '200' } })
    fireEvent.change(screen.getByPlaceholderText('190'), { target: { value: '250' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: 'TSLA', nm: '', q: 5, b: 200, c: 250, currency: 'USD' })
  })

  it('폼 통화 KRW 선택 후 추가 시 currency: KRW', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={onAdd} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    fireEvent.click(screen.getByText('KRW'))
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: '005930' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '10' } })
    fireEvent.change(screen.getByPlaceholderText('75000'), { target: { value: '75000' } })
    fireEvent.change(screen.getByPlaceholderText('82000'), { target: { value: '82000' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: '005930', nm: '', q: 10, b: 75000, c: 82000, currency: 'KRW' })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm test
```

Expected: 새 테스트 일부 실패 (currency props 없음, KRW placeholder 없음)

- [ ] **Step 3: HoldingsTable.jsx 전체 교체**

```jsx
import { useState } from 'react'
import { fmtCurrency, pct } from '../utils/format.js'

export default function HoldingsTable({ holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay }) {
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD' })

  const isKRW = form.currency === 'KRW'

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
  }

  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  return (
    <div className="holdings">
      <h2 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14 }}>
        보유 종목
      </h2>
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
                  <td>{fmtCurrency(h.c, hCur)}</td>
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

      <div className="addbar">
        <div className="field tk">
          <label>티커</label>
          <input
            placeholder="AAPL"
            value={form.ticker}
            onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>통화</label>
          <div className="currency-toggle">
            <button
              className={`currency-btn ${form.currency === 'USD' ? 'active' : ''}`}
              onClick={() => setForm(f => ({ ...f, currency: 'USD' }))}
            >USD</button>
            <button
              className={`currency-btn ${form.currency === 'KRW' ? 'active' : ''}`}
              onClick={() => setForm(f => ({ ...f, currency: 'KRW' }))}
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
          <label>현재가</label>
          <input
            type="number" step="any"
            placeholder={isKRW ? '82000' : '190'}
            value={form.cur}
            onChange={e => setForm(f => ({ ...f, cur: e.target.value }))}
          />
        </div>
        <button className="btn" onClick={handleAdd}>+ 추가</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
npm test
```

Expected: 모든 테스트 pass

- [ ] **Step 5: 커밋**

```powershell
git add src/components/HoldingsTable.jsx src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: add currency field to HoldingsTable form and rows"
```

---

## Task 7: Charts.jsx — 스냅 필터링 + displayCurrency 포맷

**Files:**
- Modify: `src/components/Charts.jsx`

- [ ] **Step 1: Charts.jsx 전체 교체**

```jsx
import { Line, Doughnut } from 'react-chartjs-2'
import { fmtCurrency } from '../utils/format.js'

const PALETTE = ['#7fd1ae','#d4b483','#e8654f','#6aa9d8','#b98fd1','#d8c46a','#5fb0a0','#d88f9e','#9ed86a','#888']

function getGradient(ctx, chartArea, isUp) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, isUp ? 'rgba(63,191,143,.28)' : 'rgba(232,101,79,.28)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  return gradient
}

export default function Charts({ holdings, snaps, totalVal, displayCurrency, toDisplay }) {
  const filteredSnaps = snaps.filter(s => (s.currency ?? 'USD') === displayCurrency)
  const labels = filteredSnaps.map(s => s.label)
  const data = filteredSnaps.map(s => s.total)
  const isUp = data.length < 2 || data[data.length - 1] >= data[0]
  const lineColor = isUp ? '#3fbf8f' : '#e8654f'

  const lineData = {
    labels,
    datasets: [{
      data,
      borderColor: lineColor,
      backgroundColor: (context) => {
        const chart = context.chart
        const { ctx, chartArea } = chart
        if (!chartArea) return 'transparent'
        return getGradient(ctx, chartArea, isUp)
      },
      fill: true,
      tension: .3,
      pointRadius: 3,
      pointBackgroundColor: lineColor,
      borderWidth: 2,
    }],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => ' ' + fmtCurrency(c.parsed.y, displayCurrency) } },
    },
    scales: {
      x: {
        grid: { color: 'rgba(39,48,44,.4)' },
        ticks: { color: '#5c6660', font: { family: 'Spline Sans Mono', size: 10 } },
      },
      y: {
        grid: { color: 'rgba(39,48,44,.4)' },
        ticks: {
          color: '#5c6660',
          font: { family: 'Spline Sans Mono', size: 10 },
          callback: v => displayCurrency === 'KRW'
            ? '₩' + v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
            : '$' + v.toLocaleString(),
        },
      },
    },
  }

  const pieData = {
    labels: holdings.map(h => h.t),
    datasets: [{
      data: holdings.map(h => toDisplay(h.q * h.c, h.currency ?? 'USD')),
      backgroundColor: PALETTE,
      borderColor: '#141816',
      borderWidth: 2,
    }],
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#8a958e', font: { family: 'Spline Sans Mono', size: 11 }, boxWidth: 10, padding: 10 },
      },
      tooltip: {
        callbacks: {
          label: c => ` ${c.label}: ${fmtCurrency(c.parsed, displayCurrency)} (${totalVal > 0 ? (c.parsed / totalVal * 100).toFixed(1) : 0}%)`,
        },
      },
    },
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>
          자산 추이 <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>snapshot history</span>
        </h2>
        <div className="chart-box">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
      <div className="card">
        <h2>
          종목 비중 <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>by value</span>
        </h2>
        <div className="chart-box">
          <Doughnut data={pieData} options={pieOptions} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 모든 테스트 통과 확인**

```powershell
cd D:\BEBIG\livenow
npm test
```

Expected: 모든 테스트 pass

- [ ] **Step 3: 빌드 확인**

```powershell
npm run build
```

Expected: 빌드 성공

- [ ] **Step 4: 최종 push**

```powershell
git add src/components/Charts.jsx
git commit -m "feat: update Charts for displayCurrency and snap filtering"
git push origin main
```

Expected: Cloudflare Pages 자동 재배포 시작
