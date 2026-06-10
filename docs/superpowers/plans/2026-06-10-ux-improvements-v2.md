# UX 개선 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 리밸런싱 가이드를 독립 섹션으로 분리하고, 파이 차트에 현금 슬라이스를 추가하며, 모바일 카드를 기본 접힌 상태로 개선한다.

**Architecture:** RebalancingGuide를 독립 컴포넌트로 추출해 DashboardPage에서 HoldingsTable 아래에 렌더링한다. Charts에 cash prop을 추가해 현금 슬라이스를 동적으로 포함한다. HoldingsTable 모바일 카드는 expandedCards 상태 맵으로 개별 토글을 관리한다.

**Tech Stack:** React 18, Vitest + Testing Library, react-i18next, react-chartjs-2 (Chart.js)

---

## 파일 구조

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/RebalancingGuide.jsx` | **신규** — 리밸런싱 가이드 독립 컴포넌트 |
| `src/__tests__/components/RebalancingGuide.test.jsx` | **신규** — RebalancingGuide 테스트 |
| `src/__tests__/components/Charts.test.jsx` | **신규** — Charts 현금 슬라이스 테스트 |
| `src/components/HoldingsTable.jsx` | 리밸런싱 로직 제거, 모바일 카드 접힘 추가 |
| `src/components/Charts.jsx` | cash prop 추가, 현금 슬라이스 렌더링 |
| `src/pages/DashboardPage.jsx` | RebalancingGuide 렌더링, Charts에 cash prop 전달 |
| `src/index.css` | 모바일 카드 접힘/펼침 CSS 추가 |

---

### Task 1: RebalancingGuide 컴포넌트 생성

**Files:**
- Create: `src/components/RebalancingGuide.jsx`
- Create: `src/__tests__/components/RebalancingGuide.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/RebalancingGuide.test.jsx` 생성:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import RebalancingGuide from '../../components/RebalancingGuide.jsx'

const identity = n => n

const defaultProps = {
  holdings: [],
  cash: 0,
  targetWeights: {},
  totalVal: 0,
  displayCurrency: 'USD',
  toDisplay: identity,
}

function renderGuide(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <RebalancingGuide {...defaultProps} {...props} />
    </I18nextProvider>
  )
}

describe('RebalancingGuide', () => {
  it('목표 비중 없을 때 렌더링 안 함', () => {
    const { container } = renderGuide()
    expect(container.firstChild).toBeNull()
  })

  it('totalVal=0 이면 렌더링 안 함', () => {
    const { container } = renderGuide({
      targetWeights: { AAPL: 50 },
      totalVal: 0,
    })
    expect(container.firstChild).toBeNull()
  })

  it('목표 비중 설정 시 리밸런싱 카드 렌더링', () => {
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 60 },
      totalVal: 1000,
    })
    expect(screen.getByText('리밸런싱 가이드')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('현재 비중 > 목표 비중이면 매도 액션 표시', () => {
    // AAPL val=1000, totalVal=1000 → currentPct=100%, target=60% → diffPct=-40% → sell
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 60 },
      totalVal: 1000,
    })
    expect(screen.getByText('매도')).toBeInTheDocument()
  })

  it('현재 비중 < 목표 비중이면 매수 액션 표시', () => {
    // AAPL val=500, totalVal=1000 → currentPct=50%, target=80% → diffPct=+30% → buy
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 5, b: 100, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 80 },
      totalVal: 1000,
    })
    expect(screen.getByText('매수')).toBeInTheDocument()
  })

  it('목표 합계 100% 미달 시 미설정 힌트 표시', () => {
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 100, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 60 },
      totalVal: 1000,
    })
    expect(screen.getByText(/40\.0% 미설정/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```
npx vitest run src/__tests__/components/RebalancingGuide.test.jsx --reporter=verbose
```

Expected: `Cannot find module '../../components/RebalancingGuide.jsx'`

- [ ] **Step 3: RebalancingGuide 컴포넌트 구현**

`src/components/RebalancingGuide.jsx` 생성:

```jsx
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtCurrency } from '../utils/format.js'
import { computeRebalancing, totalTargetWeight } from '../utils/rebalancing.js'

export default function RebalancingGuide({ holdings, cash, targetWeights, totalVal, displayCurrency, toDisplay }) {
  const { t } = useTranslation()
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

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

  if (rebalancingRows.length === 0) return null

  const total = totalTargetWeight(targetWeights)

  return (
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
      {Math.abs(total - 100) >= 0.01 && (
        <p className="rebalancing-hint">
          {t('holdings.targetTotal')}: {total.toFixed(1)}%
          {total < 100 && ` — ${(100 - total).toFixed(1)}% ${t('holdings.unassigned')}`}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
npx vitest run src/__tests__/components/RebalancingGuide.test.jsx --reporter=verbose
```

Expected: 5 tests PASS

- [ ] **Step 5: 커밋**

```
git add src/components/RebalancingGuide.jsx src/__tests__/components/RebalancingGuide.test.jsx
git commit -m "feat: add RebalancingGuide standalone component"
```

---

### Task 2: HoldingsTable 리밸런싱 로직 제거 + DashboardPage 연결

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/pages/DashboardPage.jsx`

**Context:** HoldingsTable의 `rebalancingRows` useMemo와 리밸런싱 카드 JSX를 제거한다. DashboardPage에서 `<RebalancingGuide>`를 `<HoldingsTable>` 바로 다음에 렌더링한다.

- [ ] **Step 1: HoldingsTable.jsx — import 제거**

`src/components/HoldingsTable.jsx` 6번째 줄 삭제:

```js
// 제거할 줄 (현재 line 6):
import { computeRebalancing, totalTargetWeight } from '../utils/rebalancing.js'
```

- [ ] **Step 2: HoldingsTable.jsx — rebalancingRows useMemo 제거**

현재 lines 24–35 제거:

```js
// 제거할 블록:
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
```

- [ ] **Step 3: HoldingsTable.jsx — 리밸런싱 카드 JSX 제거**

`</div>` (table-scroll 닫힘) 바로 다음에 있는 블록 제거:

```jsx
// 제거할 블록 (현재 lines 159-202):
{rebalancingRows.length > 0 && (
  <div className="rebalancing-card">
    <h3 className="rebalancing-title">{t('holdings.rebalancingGuide')}</h3>
    <table className="rebalancing-table">
      ...
    </table>
    {(() => {
      const total = totalTargetWeight(targetWeights)
      ...
    })()}
  </div>
)}
```

또한 상단 import에서 `useMemo`도 더 이상 사용되지 않으면 제거한다. (다른 곳에서 `useMemo`를 사용하지 않으면 `useState, useRef`만 남김)

- [ ] **Step 4: DashboardPage.jsx — RebalancingGuide 추가**

`src/pages/DashboardPage.jsx` 전체를 다음으로 교체:

```jsx
import Charts from '../components/Charts.jsx'
import HoldingsTable from '../components/HoldingsTable.jsx'
import RebalancingGuide from '../components/RebalancingGuide.jsx'
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
        cash={portfolio.cash}
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
        cash={portfolio.cash}
        onSetCash={portfolio.setCash}
        targetWeights={portfolio.targetWeights}
        onSetTargetWeight={portfolio.setTargetWeight}
      />
      <RebalancingGuide
        holdings={portfolio.effectiveHoldings}
        cash={portfolio.cash}
        targetWeights={portfolio.targetWeights}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
      />
      <TransactionHistory
        transactions={portfolio.transactions}
        onDelete={portfolio.deleteTransaction}
        onEdit={portfolio.editTransaction}
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

- [ ] **Step 5: 전체 테스트 통과 확인**

```
npx vitest run --reporter=verbose
```

Expected: All tests pass. HoldingsTable 테스트 중 리밸런싱 카드를 assert하는 항목이 있으면 삭제한다.

- [ ] **Step 6: 커밋**

```
git add src/components/HoldingsTable.jsx src/pages/DashboardPage.jsx
git commit -m "feat: move rebalancing guide to standalone section in DashboardPage"
```

---

### Task 3: Charts 현금 슬라이스 추가

**Files:**
- Create: `src/__tests__/components/Charts.test.jsx`
- Modify: `src/components/Charts.jsx`

**Context:** Charts.jsx의 파이 차트(Doughnut)에 cash > 0일 때 현금 슬라이스를 추가한다. DashboardPage에서 이미 `cash` prop을 전달하도록 Task 2에서 수정됐다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/Charts.test.jsx` 생성:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import Charts from '../../components/Charts.jsx'

vi.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Doughnut: vi.fn(({ data }) => (
    <canvas
      data-testid="doughnut-chart"
      data-labels={JSON.stringify(data.datasets[0] ? data.labels : [])}
      data-colors={JSON.stringify(data.datasets[0]?.backgroundColor ?? [])}
    />
  )),
}))

const identity = n => n

const defaultProps = {
  holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 100, currency: 'USD' }],
  snaps: [],
  totalVal: 1000,
  displayCurrency: 'USD',
  toDisplay: identity,
  onDeleteSnap: vi.fn(),
  onRestoreSnap: vi.fn(),
  cash: 0,
}

function renderCharts(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <Charts {...defaultProps} {...props} />
    </I18nextProvider>
  )
}

describe('Charts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cash=0 이면 현금 슬라이스 없음', () => {
    renderCharts({ cash: 0 })
    const el = screen.getByTestId('doughnut-chart')
    const labels = JSON.parse(el.dataset.labels)
    expect(labels).not.toContain('현금')
  })

  it('cash>0 이면 현금 슬라이스 포함', () => {
    renderCharts({ cash: 500 })
    const el = screen.getByTestId('doughnut-chart')
    const labels = JSON.parse(el.dataset.labels)
    expect(labels).toContain('현금')
  })

  it('현금 슬라이스 색상은 #94a3b8', () => {
    renderCharts({ cash: 500 })
    const el = screen.getByTestId('doughnut-chart')
    const colors = JSON.parse(el.dataset.colors)
    expect(colors).toContain('#94a3b8')
  })

  it('cash=0 이면 현금 색상 없음', () => {
    renderCharts({ cash: 0 })
    const el = screen.getByTestId('doughnut-chart')
    const colors = JSON.parse(el.dataset.colors)
    expect(colors).not.toContain('#94a3b8')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```
npx vitest run src/__tests__/components/Charts.test.jsx --reporter=verbose
```

Expected: 현금 슬라이스 관련 테스트 FAIL (cash prop이 아직 처리 안 됨)

- [ ] **Step 3: Charts.jsx 수정**

`src/components/Charts.jsx`의 export default 함수 시그니처와 pieData/chartTotal 계산을 수정한다.

함수 시그니처 (line 15) 변경:
```js
// 변경 전:
export default function Charts({ holdings, snaps, totalVal, displayCurrency, toDisplay, onDeleteSnap, onRestoreSnap }) {

// 변경 후:
export default function Charts({ holdings, snaps, totalVal, displayCurrency, toDisplay, onDeleteSnap, onRestoreSnap, cash = 0 }) {
```

`const chartTotal` 및 `const pieData` 블록 (lines 111–138) 전체를 다음으로 교체:

```js
const cashVal = Number(cash) || 0
const chartTotal = holdings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0) + cashVal

const pieLabels = holdings.map(h => h.t)
const pieValues = holdings.map(h => toDisplay(h.q * h.c, h.currency ?? 'USD'))
const pieColors = holdings.map((_, i) => PALETTE[i % PALETTE.length])

if (cashVal > 0) {
  pieLabels.push(t('holdings.cash'))
  pieValues.push(cashVal)
  pieColors.push('#94a3b8')
}

const pieData = {
  labels: pieLabels,
  datasets: [{
    data: pieValues,
    backgroundColor: pieColors,
    borderColor: '#141816',
    borderWidth: 2,
  }],
}
```

- [ ] **Step 4: 테스트 통과 확인**

```
npx vitest run src/__tests__/components/Charts.test.jsx --reporter=verbose
```

Expected: 4 tests PASS

- [ ] **Step 5: 전체 테스트 통과 확인**

```
npx vitest run --reporter=verbose
```

Expected: All tests pass

- [ ] **Step 6: 커밋**

```
git add src/components/Charts.jsx src/__tests__/components/Charts.test.jsx
git commit -m "feat: add cash slice to portfolio allocation pie chart"
```

---

### Task 4: 모바일 카드 접기/펼치기 + CSS

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/index.css`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

**Context:** 모바일 카드(`.holdings-mobile-list` 내부)를 기본 접힌 상태로 변경한다. 접힌 상태에서는 이름(truncated) + 평가액 + 수익률 + `∨` 버튼만 표시하고, 클릭 시 전체 내용 + `∧` 버튼을 표시한다. CASH 카드는 항상 펼침.

- [ ] **Step 1: HoldingsTable 테스트에 접힘/펼침 케이스 추가**

`src/__tests__/components/HoldingsTable.test.jsx`에 다음 테스트 추가:

```jsx
describe('모바일 카드 접기/펼치기', () => {
  const mobileHoldings = [
    { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190, currency: 'USD', exchange: '' },
  ]

  it('기본 상태: 모바일 카드 stats가 렌더링 안 됨', () => {
    const { container } = renderHoldingsTable({ holdings: mobileHoldings, totalVal: 1900 })
    // .holdings-mobile-list 내부에 .holding-card-stats가 없어야 함
    const mobileList = container.querySelector('.holdings-mobile-list')
    expect(mobileList.querySelector('.holding-card-stats')).toBeNull()
  })

  it('∨ 버튼 클릭 시 stats 렌더링', () => {
    const { container } = renderHoldingsTable({ holdings: mobileHoldings, rawHoldings: mobileHoldings, totalVal: 1900 })
    const toggleBtn = screen.getByTitle('펼치기')
    fireEvent.click(toggleBtn)
    const mobileList = container.querySelector('.holdings-mobile-list')
    expect(mobileList.querySelector('.holding-card-stats')).toBeInTheDocument()
  })

  it('∧ 버튼 클릭 시 stats 다시 숨김', () => {
    const { container } = renderHoldingsTable({ holdings: mobileHoldings, rawHoldings: mobileHoldings, totalVal: 1900 })
    fireEvent.click(screen.getByTitle('펼치기'))
    const mobileList = container.querySelector('.holdings-mobile-list')
    expect(mobileList.querySelector('.holding-card-stats')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('접기'))
    expect(mobileList.querySelector('.holding-card-stats')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```
npx vitest run src/__tests__/components/HoldingsTable.test.jsx --reporter=verbose
```

Expected: 접기/펼치기 관련 3개 테스트 FAIL

- [ ] **Step 3: HoldingsTable.jsx — expandedCards 상태 추가**

파일 상단 `useState` import는 이미 있음. 컴포넌트 body 내 상태 선언부 (line 14 근처)에 추가:

```js
// 기존:
const [editingIndex, setEditingIndex] = useState(null)
const [cashEditing, setCashEditing] = useState(false)

// 추가 (아래에):
const [expandedCards, setExpandedCards] = useState({})
const toggleCard = (ticker) =>
  setExpandedCards(prev => ({ ...prev, [ticker]: !prev[ticker] }))
```

- [ ] **Step 4: HoldingsTable.jsx — 모바일 카드 JSX 리팩터링**

`.holdings-mobile-list` 내부의 holdings.map 블록 (현재 lines 217–265)을 다음으로 교체:

```jsx
{holdings.map((h, i) => {
  const hCur = h.currency ?? 'USD'
  const val = toDisplay(h.q * h.c, hCur)
  const cost = toDisplay(h.q * h.b, hCur)
  const p = val - cost
  const r = cost > 0 ? p / cost * 100 : 0
  const w = totalVal > 0 ? val / totalVal * 100 : 0
  const market = h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : 'US'
  const isExpanded = !!expandedCards[h.t]
  return (
    <div className="holding-card" key={i}>
      <div className="holding-card-header">
        <div className="holding-card-name-wrap">
          <div className="holding-card-name">
            {h.nm || h.t}
            <span className="market-badge">{market}</span>
          </div>
        </div>
        <div className="holding-card-summary-right">
          <div className="holding-card-val">{fmtCurrency(val, displayCurrency)}</div>
          <div className={`holding-card-rate ${r >= 0 ? 'pos' : 'neg'}`}>{pctArrow(r)}</div>
          <button
            className="mobile-card-toggle"
            onClick={() => toggleCard(h.t)}
            title={isExpanded ? t('common.collapse') : t('common.expand')}
          >
            {isExpanded ? '∧' : '∨'}
          </button>
        </div>
      </div>
      {isExpanded && (
        <>
          <div className="holding-card-sub">{h.t} · {h.q.toLocaleString()} {t('holdings.qty')}</div>
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
            <div>
              <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
              <div className="holding-card-stat-val">
                {targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}
              </div>
            </div>
          </div>
          <div className="holding-card-actions">
            <button className="edit" onClick={() => setEditingIndex(i)} title={t('holdings.edit')}>✎</button>
          </div>
        </>
      )}
    </div>
  )
})}
```

- [ ] **Step 5: i18n 키 추가**

`src/locales/ko.json`의 `"common"` 섹션에 추가:

```json
"expand": "펼치기",
"collapse": "접기"
```

`src/locales/en.json`의 `"common"` 섹션에 추가:

```json
"expand": "Expand",
"collapse": "Collapse"
```

- [ ] **Step 6: index.css에 CSS 추가**

`src/index.css`의 `.holdings-mobile-list` 관련 CSS 섹션 끝에 추가:

```css
/* 모바일 카드 헤더 레이아웃 */
.holding-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.holding-card-name-wrap {
  min-width: 0;
  flex: 1;
}

.holding-card-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.holding-card-summary-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.mobile-card-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--ink-faint);
  padding: 4px 6px;
  flex-shrink: 0;
  line-height: 1;
}

.mobile-card-toggle:hover {
  color: var(--ink);
}
```

주의: `.holding-card-name`은 `.holdings-mobile-list` 내부에서만 사용되므로 CSS 충돌 없음.

- [ ] **Step 7: 테스트 통과 확인**

```
npx vitest run --reporter=verbose
```

Expected: All tests pass

- [ ] **Step 8: 커밋**

```
git add src/components/HoldingsTable.jsx src/index.css src/__tests__/components/HoldingsTable.test.jsx src/locales/ko.json src/locales/en.json
git commit -m "feat: mobile card collapse/expand with truncated name display"
```
