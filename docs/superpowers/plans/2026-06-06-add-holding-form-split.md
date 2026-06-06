# AddHoldingForm Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the add-holding form and stock search logic from `HoldingsTable.jsx` into a new `AddHoldingForm.jsx` component, leaving HoldingsTable responsible only for table display and the edit modal.

**Architecture:** Create `src/components/AddHoldingForm.jsx` with all form state, handlers, and JSX moved verbatim from HoldingsTable. HoldingsTable imports AddHoldingForm and renders it in place of the removed `.addbar` block. No props change at the HoldingsTable boundary — its callers are unaffected.

**Tech Stack:** React (useState, useRef), existing utils (finnhub.js, stockSearch.js)

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Create | `src/components/AddHoldingForm.jsx` | New component — form state + handlers + JSX |
| Modify | `src/components/HoldingsTable.jsx` | Remove form logic, add `<AddHoldingForm onAdd={onAdd} />` |

---

### Task 1: Establish baseline

**Files:**
- Run: test suite

- [ ] **Step 1: Run the full test suite**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)` across 11 files. If any are already failing, note them — don't count them as regressions.

---

### Task 2: Create `AddHoldingForm.jsx`

**Files:**
- Create: `src/components/AddHoldingForm.jsx`

- [ ] **Step 1: Create the file with the full implementation**

`src/components/AddHoldingForm.jsx`:
```jsx
import { useState, useRef } from 'react'
import { fetchQuote } from '../utils/finnhub.js'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../utils/stockSearch.js'

export default function AddHoldingForm({ onAdd }) {
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
  const [tickerStatus, setTickerStatus] = useState('idle')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef(null)

  const isKRW = form.currency === 'KRW'

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
      if (price !== null) setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: String(price) })
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

  return (
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
  )
}
```

- [ ] **Step 2: Run tests — expect 96 passing (no regressions)**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`. The new file isn't imported anywhere yet, so nothing changes.

---

### Task 3: Update `HoldingsTable.jsx`

**Files:**
- Modify: `src/components/HoldingsTable.jsx`

- [ ] **Step 1: Replace the entire file content**

`src/components/HoldingsTable.jsx`:
```jsx
import { useState } from 'react'
import EditModal from './EditModal.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import { fmtCurrency, pct } from '../utils/format.js'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},
}) {
  const [editingIndex, setEditingIndex] = useState(null)

  const hasAutoHoldings = holdings.some(h =>
    (h.currency ?? 'USD') === 'USD' || (h.currency === 'KRW' && h.exchange)
  )
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

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

      <AddHoldingForm onAdd={onAdd} />
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

- [ ] **Step 2: Run tests — must match baseline**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`. Tests render HoldingsTable and interact with the form — they should pass because the rendered DOM is identical.

---

### Task 4: Final verification and commit

**Files:**
- Verify: `src/components/AddHoldingForm.jsx`, `src/components/HoldingsTable.jsx`

- [ ] **Step 1: Confirm line counts**

```bash
wc -l src/components/HoldingsTable.jsx src/components/AddHoldingForm.jsx
```

Expected:
- `HoldingsTable.jsx`: ~150 lines
- `AddHoldingForm.jsx`: ~140 lines

- [ ] **Step 2: Run full test suite one final time**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`

- [ ] **Step 3: Commit**

```bash
git add src/components/AddHoldingForm.jsx src/components/HoldingsTable.jsx
git commit -m "refactor: extract AddHoldingForm from HoldingsTable"
```
