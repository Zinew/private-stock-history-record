# Mobile Card View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace wide tables with responsive card layouts on mobile (≤640px) for HoldingsTable and TransactionHistory on the Dashboard.

**Architecture:** CSS media-query toggle — keep existing `<table>` in DOM, add sibling mobile card markup in each component, show/hide with `display:none/block` at 640px. No prop/logic changes; same data feeds both views.

**Tech Stack:** React, Vitest + Testing Library, CSS custom properties (design tokens in `:root`)

---

## File Map

| File | Change |
|---|---|
| `src/index.css` | Add mobile card CSS classes + `@media (max-width: 640px)` block |
| `src/components/HoldingsTable.jsx` | Add `.holdings-mobile-list` card section after `.table-scroll` |
| `src/components/TransactionHistory.jsx` | Add `.tx-mobile-list` card section after `.table-scroll` |
| `src/__tests__/components/HoldingsTable.test.jsx` | Add mobile card test cases |
| `src/__tests__/components/TransactionHistory.test.jsx` | Create new test file |

---

## Before you start: Create a feature branch

```bash
git checkout -b feat/mobile-card-view
```

All commits in Tasks 1–3 go on this branch. Merge to `main` after final verification.

---

## Task 1: CSS — Mobile card styles

**Files:**
- Modify: `src/index.css` (append to end, after line 1058)

> No TDD for pure CSS — jsdom does not evaluate media queries. Tests in Tasks 2 and 3 verify the CSS class names exist in the DOM.

- [ ] **Step 1: Append mobile card styles to `src/index.css`**

Add the following block to the very end of `src/index.css`:

```css
/* ===== Mobile card view ===== */
.holdings-mobile-list { display: none }
.tx-mobile-list { display: none }

.holding-card,
.tx-card {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 10px;
}

.holding-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.holding-card-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.holding-card-sub {
  color: var(--ink-faint);
  font-size: 11px;
  margin-top: 3px;
}

.holding-card-val {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
}

.holding-card-rate {
  font-size: 12px;
  text-align: right;
  margin-top: 2px;
}

.holding-card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  text-align: center;
}

.holding-card-stat-label {
  color: var(--ink-faint);
  font-size: 10px;
  margin-bottom: 3px;
}

.holding-card-stat-val {
  color: var(--ink-dim);
  font-size: 12px;
}

.holding-card-actions,
.tx-card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.tx-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.tx-card-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 4px;
  display: inline-block;
}

.tx-card-badge.buy { background: rgba(63,191,143,.15); color: var(--gain) }
.tx-card-badge.sell { background: rgba(232,101,79,.15); color: var(--loss) }

.tx-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.tx-card-sub {
  font-size: 11px;
  color: var(--ink-faint);
  margin-top: 3px;
}

.tx-card-amount {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
}

@media (max-width: 640px) {
  body { padding: 16px 12px 80px }
  .table-scroll { display: none }
  .holdings-mobile-list { display: block }
  .tx-mobile-list { display: block }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add mobile card CSS classes"
```

---

## Task 2: HoldingsTable — Mobile card markup (TDD)

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

**Context:** `HoldingsTable` receives `holdings` (array of `{t, nm, q, b, c, currency, exchange?}`), `totalVal`, `toDisplay`, `displayCurrency`, `rawHoldings`, `onEdit`. State `editingIndex` controls the `EditModal`. The component already imports `fmtCurrency`, `pctArrow` from `../utils/format.js`.

- [ ] **Step 1: Write failing tests**

Append the following `describe` block to `src/__tests__/components/HoldingsTable.test.jsx`, after all existing tests (before the final `})`):

```jsx
describe('HoldingsTable 모바일 카드', () => {
  it('holdings-mobile-list 컨테이너 존재', () => {
    const { container } = renderHoldingsTable()
    expect(container.querySelector('.holdings-mobile-list')).toBeInTheDocument()
  })

  it('종목이 있을 때 holding-card 렌더링', () => {
    const { container } = renderHoldingsTable({ holdings: mockHoldings, totalVal: 1900 })
    expect(container.querySelectorAll('.holding-card')).toHaveLength(1)
  })

  it('카드에 ticker와 name 표시', () => {
    const { container } = renderHoldingsTable({ holdings: mockHoldings, totalVal: 1900 })
    const list = container.querySelector('.holdings-mobile-list')
    expect(list).toHaveTextContent('AAPL')
    expect(list).toHaveTextContent('Apple Inc.')
  })

  it('수익률 양수 → pos 클래스', () => {
    const { container } = renderHoldingsTable({ holdings: mockHoldings, totalVal: 1900 })
    const rate = container.querySelector('.holdings-mobile-list .holding-card-rate')
    expect(rate).toHaveClass('pos')
  })

  it('카드 ✎ 버튼 클릭 시 EditModal 표시', () => {
    const { container } = renderHoldingsTable({
      holdings: mockHoldings,
      rawHoldings: mockHoldings,
      totalVal: 1900,
    })
    const editBtn = container.querySelector('.holdings-mobile-list .edit')
    fireEvent.click(editBtn)
    expect(screen.getByText('AAPL 수정')).toBeInTheDocument()
  })

  it('holding-card-stats 3개 stat 항목 렌더링', () => {
    const { container } = renderHoldingsTable({ holdings: mockHoldings, totalVal: 1900 })
    const stats = container.querySelectorAll('.holdings-mobile-list .holding-card-stats > div')
    expect(stats).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test
```

Expected: 6 new failures with "querySelector(...) is null" or similar — `.holdings-mobile-list` does not exist yet.

- [ ] **Step 3: Add mobile card markup to `HoldingsTable.jsx`**

In `src/components/HoldingsTable.jsx`, insert the following block immediately after the closing `</div>` of `.table-scroll` (after line 120, before the `<div ref={addbarRef}>`):

```jsx
      <div className="holdings-mobile-list">
        {holdings.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📈</span>
            <h3 className="empty-state-title">{t('holdings.emptyTitle')}</h3>
            <p className="empty-state-desc">{t('holdings.emptyDesc')}</p>
            <button
              className="btn empty-state-cta"
              onClick={() => addbarRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('holdings.addFirst')}
            </button>
          </div>
        ) : holdings.map((h, i) => {
          const hCur = h.currency ?? 'USD'
          const val = toDisplay(h.q * h.c, hCur)
          const cost = toDisplay(h.q * h.b, hCur)
          const p = val - cost
          const r = cost > 0 ? p / cost * 100 : 0
          const w = totalVal > 0 ? val / totalVal * 100 : 0
          const market = h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : 'US'
          return (
            <div className="holding-card" key={i}>
              <div className="holding-card-header">
                <div>
                  <div className="holding-card-name">
                    {h.nm || h.t}
                    <span className="market-badge">{market}</span>
                  </div>
                  <div className="holding-card-sub">{h.t} · {h.q.toLocaleString()} {t('holdings.qty')}</div>
                </div>
                <div>
                  <div className="holding-card-val">{fmtCurrency(val, displayCurrency)}</div>
                  <div className={`holding-card-rate ${r >= 0 ? 'pos' : 'neg'}`}>{pctArrow(r)}</div>
                </div>
              </div>
              <div className="holding-card-stats">
                <div>
                  <div className="holding-card-stat-label">{t('holdings.currentPrice')}</div>
                  <div className="holding-card-stat-val">{fmtCurrency(h.c, hCur)}</div>
                </div>
                <div>
                  <div className="holding-card-stat-label">{t('holdings.avgCost')}</div>
                  <div className="holding-card-stat-val">{fmtCurrency(h.b, hCur)}</div>
                </div>
                <div>
                  <div className="holding-card-stat-label">{t('holdings.weight')}</div>
                  <div className="holding-card-stat-val">{w.toFixed(1)}%</div>
                </div>
              </div>
              <div className="holding-card-actions">
                <button className="edit" onClick={() => setEditingIndex(i)} title={t('holdings.edit')}>✎</button>
              </div>
            </div>
          )
        })}
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test
```

Expected: all tests pass (including the 6 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/components/HoldingsTable.jsx src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: add mobile card view to HoldingsTable"
```

---

## Task 3: TransactionHistory — Mobile card markup (TDD)

**Files:**
- Create: `src/__tests__/components/TransactionHistory.test.jsx`
- Modify: `src/components/TransactionHistory.jsx`

**Context:** `TransactionHistory` receives `transactions` (array of `{id, type, ticker, name, qty, price, currency, date?}`), `onDelete`, `onEdit`. State `editingTx` controls `TransactionEditModal`. The component already imports `fmtCurrency` and `useTranslation`. `sorted` is the transactions sorted by date descending.

- [ ] **Step 1: Create failing test file `src/__tests__/components/TransactionHistory.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import TransactionHistory from '../../components/TransactionHistory.jsx'

const mockTxs = [
  { id: 'tx1', type: 'buy', ticker: 'AAPL', name: 'Apple Inc.', qty: 10, price: 150, currency: 'USD', date: '2026-05-01' },
  { id: 'tx2', type: 'sell', ticker: 'MSFT', name: 'Microsoft', qty: 5, price: 200, currency: 'USD', date: '2026-04-01' },
]

function renderTx(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TransactionHistory
        transactions={[]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  )
}

describe('TransactionHistory', () => {
  it('거래 없을 때 빈 안내 메시지', () => {
    renderTx()
    expect(screen.getAllByText('거래 이력이 없습니다').length).toBeGreaterThan(0)
  })

  it('거래 있을 때 테이블에 ticker 표시', () => {
    const { container } = renderTx({ transactions: mockTxs })
    const table = container.querySelector('.table-scroll')
    expect(table).toHaveTextContent('AAPL')
  })
})

describe('TransactionHistory 모바일 카드', () => {
  it('tx-mobile-list 컨테이너 존재', () => {
    const { container } = renderTx()
    expect(container.querySelector('.tx-mobile-list')).toBeInTheDocument()
  })

  it('거래가 있을 때 tx-card 렌더링', () => {
    const { container } = renderTx({ transactions: mockTxs })
    expect(container.querySelectorAll('.tx-card')).toHaveLength(2)
  })

  it('카드에 ticker와 날짜 표시', () => {
    const { container } = renderTx({ transactions: mockTxs })
    const list = container.querySelector('.tx-mobile-list')
    expect(list).toHaveTextContent('AAPL')
    expect(list).toHaveTextContent('2026-05-01')
  })

  it('매수 카드 → buy 뱃지', () => {
    const { container } = renderTx({ transactions: [mockTxs[0]] })
    const badge = container.querySelector('.tx-mobile-list .tx-card-badge.buy')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('매수')
  })

  it('매도 카드 → sell 뱃지', () => {
    const { container } = renderTx({ transactions: [mockTxs[1]] })
    const badge = container.querySelector('.tx-mobile-list .tx-card-badge.sell')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('매도')
  })

  it('카드 ✎ 버튼 클릭 시 TransactionEditModal 표시', () => {
    const { container } = renderTx({ transactions: [mockTxs[0]] })
    const editBtn = container.querySelector('.tx-mobile-list .edit')
    fireEvent.click(editBtn)
    expect(screen.getByText(/AAPL 거래 수정/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test
```

Expected: 5 mobile card tests fail — `.tx-mobile-list` does not exist yet. The 2 non-mobile tests should already pass (basic table rendering exists).

- [ ] **Step 3: Add mobile card markup to `TransactionHistory.jsx`**

In `src/components/TransactionHistory.jsx`, insert the following block immediately after the closing `</div>` of `.table-scroll` (after line 62, before the `{editingTx &&`):

```jsx
      <div className="tx-mobile-list">
        {sorted.length === 0 ? (
          <p className="empty">{t('tx.empty')}</p>
        ) : sorted.map(tx => (
          <div className="tx-card" key={tx.id}>
            <div className="tx-card-header">
              <div>
                <span className={`tx-card-badge ${tx.type}`}>{t(`tx.${tx.type}`)}</span>
                <div className="tx-card-name">
                  {tx.name && tx.name !== tx.ticker ? tx.name : tx.ticker}
                </div>
                <div className="tx-card-sub">
                  {tx.date ?? t('tx.unknownDate')} · {tx.qty.toLocaleString()} {t('tx.qty')} · {fmtCurrency(tx.price, tx.currency)}
                </div>
              </div>
              <div>
                <div className="tx-card-amount">{fmtCurrency(tx.qty * tx.price, tx.currency)}</div>
              </div>
            </div>
            <div className="tx-card-actions">
              <button className="edit" onClick={() => setEditingTx(tx)} title={t('tx.edit')}>✎</button>
            </div>
          </div>
        ))}
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/TransactionHistory.jsx src/__tests__/components/TransactionHistory.test.jsx
git commit -m "feat: add mobile card view to TransactionHistory"
```

---

## Final verification

- [ ] **Step 1: Run full test suite**

```
npm test
```

Expected: all tests pass. Check the count includes the new mobile card tests.

- [ ] **Step 2: Visual check in browser**

Start dev server:

```
npm run dev
```

Open `http://localhost:5173`, open DevTools → device toolbar, set width to 390px (iPhone).

Verify:
1. Holdings table hidden, holding cards visible
2. Each card shows name, market badge, value, return %, current price, avg cost, weight
3. ✎ button on each card opens EditModal
4. Transaction table hidden, tx cards visible
5. Each card shows buy/sell badge (correct color), ticker, date, qty, price, amount
6. ✎ button opens TransactionEditModal
7. Resize to 700px — tables visible, cards hidden

- [ ] **Step 3: Merge feature branch to main and push**

```bash
git checkout main
git merge feat/mobile-card-view
git push
```

Cloudflare Pages auto-deploys from `main`.
