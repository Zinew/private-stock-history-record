# 스냅샷 포인트 개별 삭제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스냅샷 추이 차트에서 개별 포인트를 클릭해 삭제하고, 삭제 직후 5초간 언두 토스트로 복원할 수 있는 기능을 추가한다.

**Architecture:** `usePortfolio` 훅에 `deleteSnap(index)` / `restoreSnap(snap, index)` 순수 함수를 추가한다. `DashboardPage`가 이를 `Charts`에 prop으로 전달하고, `Charts`는 Chart.js `onClick` 콜백으로 포인트 클릭을 감지해 캔버스 위에 인라인 팝업을 절대 위치로 띄운다. 삭제 확정 후 5초 언두 토스트를 표시하며, 타이머는 `useRef`로 관리해 메모리 누수를 막는다.

**Tech Stack:** React (useState, useRef, useEffect), react-chartjs-2, Vitest, react-i18next

---

## 파일 구조

| 파일 | 작업 |
|---|---|
| `src/hooks/usePortfolio.js` | `deleteSnap`, `restoreSnap` 함수 추가 및 return에 포함 |
| `src/__tests__/usePortfolio.test.js` | 신규 — `deleteSnap` / `restoreSnap` 유닛 테스트 |
| `src/locales/ko.json` | `charts` 네임스페이스에 4개 키 추가 |
| `src/locales/en.json` | 동일 키 영문 번역 추가 |
| `src/index.css` | `.snap-popup`, `.snap-undo-toast` 스타일 추가 |
| `src/pages/DashboardPage.jsx` | `Charts`에 `onDeleteSnap`, `onRestoreSnap` prop 추가 |
| `src/components/Charts.jsx` | 클릭 핸들러, 팝업 UI, 언두 토스트 추가 |

---

## Task 1: `usePortfolio` — `deleteSnap` + `restoreSnap` + 테스트

**Files:**
- Modify: `src/hooks/usePortfolio.js`
- Create: `src/__tests__/usePortfolio.test.js`

- [ ] **Step 1: 테스트 파일 먼저 작성**

`src/__tests__/usePortfolio.test.js`:

```js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePortfolio } from '../hooks/usePortfolio.js'

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  })
})
afterEach(() => vi.restoreAllMocks())

describe('deleteSnap', () => {
  it('removes snapshot at the given index, others unchanged', () => {
    localStorage.setItem('ledger_snaps', JSON.stringify([
      { label: '6/7 10:00', total: 10000, currency: 'USD' },
      { label: '6/7 12:00', total: 11000, currency: 'USD' },
      { label: '6/7 14:00', total: 12000, currency: 'USD' },
    ]))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.deleteSnap(1) })
    expect(result.current.snaps).toHaveLength(2)
    expect(result.current.snaps[0].label).toBe('6/7 10:00')
    expect(result.current.snaps[1].label).toBe('6/7 14:00')
  })

  it('persists deletion to localStorage', () => {
    localStorage.setItem('ledger_snaps', JSON.stringify([
      { label: '6/7 10:00', total: 10000, currency: 'USD' },
      { label: '6/7 12:00', total: 11000, currency: 'USD' },
    ]))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.deleteSnap(0) })
    const stored = JSON.parse(localStorage.getItem('ledger_snaps'))
    expect(stored).toHaveLength(1)
    expect(stored[0].label).toBe('6/7 12:00')
  })
})

describe('restoreSnap', () => {
  it('inserts snapshot back at the original index', () => {
    localStorage.setItem('ledger_snaps', JSON.stringify([
      { label: '6/7 10:00', total: 10000, currency: 'USD' },
      { label: '6/7 14:00', total: 12000, currency: 'USD' },
    ]))
    const snap = { label: '6/7 12:00', total: 11000, currency: 'USD' }
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.restoreSnap(snap, 1) })
    expect(result.current.snaps).toHaveLength(3)
    expect(result.current.snaps[0].label).toBe('6/7 10:00')
    expect(result.current.snaps[1].label).toBe('6/7 12:00')
    expect(result.current.snaps[2].label).toBe('6/7 14:00')
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npm test -- --run src/__tests__/usePortfolio.test.js
```

Expected: FAIL — `deleteSnap is not a function` 또는 유사 오류.

- [ ] **Step 3: `usePortfolio.js`에 함수 추가**

`clearSnaps` 함수 (line 78) 바로 아래에 두 함수 추가:

```js
  function deleteSnap(index) {
    setSnaps(prev => prev.filter((_, i) => i !== index))
  }

  function restoreSnap(snap, index) {
    setSnaps(prev => {
      const next = [...prev]
      next.splice(index, 0, snap)
      return next
    })
  }
```

`return` 객체 (line 82~104)에 두 함수 추가:

```js
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
    deleteSnap,
    restoreSnap,
  }
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npm test -- --run src/__tests__/usePortfolio.test.js
```

Expected: 3/3 PASS.

- [ ] **Step 5: 전체 테스트 실행**

```bash
npm test -- --run
```

Expected: 기존 125개 + 새 3개 = 128개 전부 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/hooks/usePortfolio.js src/__tests__/usePortfolio.test.js
git commit -m "feat: add deleteSnap and restoreSnap to usePortfolio"
```

---

## Task 2: i18n 키 추가

**Files:**
- Modify: `src/locales/ko.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: `ko.json`의 `charts` 블록에 4개 키 추가**

현재 `charts` 블록:
```json
"charts": {
  "trend": "자산 추이",
  "allocation": "종목 비중"
}
```

변경 후:
```json
"charts": {
  "trend": "자산 추이",
  "allocation": "종목 비중",
  "deleteSnap": "삭제",
  "cancelDelete": "취소",
  "snapDeleted": "스냅샷 삭제됨",
  "undoDelete": "되돌리기"
}
```

- [ ] **Step 2: `en.json`의 `charts` 블록에 동일 키 추가**

현재 `charts` 블록:
```json
"charts": {
  "trend": "Portfolio Trend",
  "allocation": "Allocation"
}
```

변경 후:
```json
"charts": {
  "trend": "Portfolio Trend",
  "allocation": "Allocation",
  "deleteSnap": "Delete",
  "cancelDelete": "Cancel",
  "snapDeleted": "Snapshot deleted",
  "undoDelete": "Undo"
}
```

- [ ] **Step 3: 전체 테스트 실행 — 기존 테스트 영향 없음 확인**

```bash
npm test -- --run
```

Expected: 128개 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/locales/ko.json src/locales/en.json
git commit -m "feat: add snapshot delete i18n keys"
```

---

## Task 3: CSS 스타일 추가

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: `src/index.css` 끝에 스타일 추가**

파일 맨 끝에 아래 CSS를 추가한다 (기존 내용은 그대로 유지):

```css
/* Snapshot delete popup */
.snap-popup {
  position: absolute;
  transform: translate(-50%, calc(-100% - 12px));
  background: #1a211d;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 6px;
  padding: 8px 10px;
  z-index: 10;
  white-space: nowrap;
  pointer-events: auto;
}
.snap-popup-info {
  font-size: 11px;
  color: #8a958e;
  margin-bottom: 6px;
  font-family: 'Spline Sans Mono', monospace;
}
.snap-popup-actions {
  display: flex;
  gap: 6px;
}
.snap-popup-actions button {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,.15);
  background: transparent;
  color: #c8d4cc;
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
}
.snap-popup-delete {
  background: rgba(232,101,79,.15) !important;
  border-color: #e8654f !important;
  color: #e8654f !important;
}

/* Snapshot undo toast */
.snap-undo-toast {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: #1a211d;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 6px;
  padding: 7px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #8a958e;
  z-index: 10;
  white-space: nowrap;
  pointer-events: auto;
}
.snap-undo-toast button {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,.2);
  background: transparent;
  color: #c8d4cc;
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.css
git commit -m "feat: add snap-popup and snap-undo-toast styles"
```

---

## Task 4: `DashboardPage.jsx` + `Charts.jsx` — 클릭 핸들러 + 팝업 + 언두 토스트

**Files:**
- Modify: `src/pages/DashboardPage.jsx`
- Modify: `src/components/Charts.jsx`

- [ ] **Step 1: `DashboardPage.jsx`에 prop 추가**

현재 `<Charts ... />` 호출 (line 10-16):
```jsx
      <Charts
        holdings={portfolio.effectiveHoldings}
        snaps={portfolio.snaps}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
      />
```

변경 후:
```jsx
      <Charts
        holdings={portfolio.effectiveHoldings}
        snaps={portfolio.snaps}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
        onDeleteSnap={portfolio.deleteSnap}
        onRestoreSnap={portfolio.restoreSnap}
      />
```

- [ ] **Step 2: `Charts.jsx` 전체 교체**

현재 파일 전체를 아래로 교체한다:

```jsx
import { useState, useRef, useEffect } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import { fmtCurrency, tooltipDeltaLines } from '../utils/format.js'
import { useTranslation } from 'react-i18next'

const PALETTE = ['#7fd1ae','#d4b483','#e8654f','#6aa9d8','#b98fd1','#d8c46a','#5fb0a0','#d88f9e','#9ed86a','#888']

function getGradient(ctx, chartArea, isUp) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, isUp ? 'rgba(63,191,143,.28)' : 'rgba(232,101,79,.28)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  return gradient
}

export default function Charts({ holdings, snaps, totalVal, displayCurrency, toDisplay, onDeleteSnap, onRestoreSnap }) {
  const { t } = useTranslation()
  const [popup, setPopup] = useState(null)
  const [undoState, setUndoState] = useState(null)
  const undoTimerRef = useRef(null)

  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [])

  const labels = snaps.map(s => s.label)
  const data = snaps.map(s => toDisplay(s.total, s.currency ?? 'USD'))
  const isUp = data.length < 2 || data[data.length - 1] >= data[0]
  const lineColor = isUp ? '#3fbf8f' : '#e8654f'

  function handleChartClick(event, elements, chart) {
    if (!elements.length) { setPopup(null); return }
    const el = elements[0]
    const meta = chart.getDatasetMeta(0)
    const point = meta.data[el.index]
    setPopup({
      index: el.index,
      x: point.x,
      y: point.y,
      label: snaps[el.index].label,
      value: fmtCurrency(data[el.index], displayCurrency),
    })
  }

  function handleDelete() {
    const snap = snaps[popup.index]
    const idx = popup.index
    onDeleteSnap(idx)
    setPopup(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoState({ snap, index: idx })
    undoTimerRef.current = setTimeout(() => setUndoState(null), 5000)
  }

  function handleUndo() {
    clearTimeout(undoTimerRef.current)
    onRestoreSnap(undoState.snap, undoState.index)
    setUndoState(null)
  }

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
    onClick: handleChartClick,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: c => tooltipDeltaLines(c.parsed.y, data[c.dataIndex - 1], displayCurrency),
        },
      },
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
          {t('charts.trend')} <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>snapshot history</span>
        </h2>
        <div className="chart-box">
          <Line data={lineData} options={lineOptions} />
          {popup && (
            <div
              className="snap-popup"
              style={{ left: popup.x, top: popup.y }}
            >
              <div className="snap-popup-info">{popup.label} · {popup.value}</div>
              <div className="snap-popup-actions">
                <button onClick={() => setPopup(null)}>{t('charts.cancelDelete')}</button>
                <button className="snap-popup-delete" onClick={handleDelete}>{t('charts.deleteSnap')}</button>
              </div>
            </div>
          )}
          {undoState && (
            <div className="snap-undo-toast">
              <span>{t('charts.snapDeleted')}</span>
              <button onClick={handleUndo}>{t('charts.undoDelete')}</button>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <h2>
          {t('charts.allocation')} <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>by value</span>
        </h2>
        <div className="chart-box">
          <Doughnut data={pieData} options={pieOptions} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 전체 테스트 실행**

```bash
npm test -- --run
```

Expected: 128개 전부 PASS. (Charts.jsx 변경은 캔버스 의존으로 기존 테스트에 영향 없음.)

- [ ] **Step 4: 커밋**

```bash
git add src/pages/DashboardPage.jsx src/components/Charts.jsx
git commit -m "feat: add per-snapshot delete popup and undo toast to chart"
```

---

## 수동 E2E 검증 체크리스트

구현 완료 후 브라우저에서 확인:

- [ ] 스냅샷이 2개 이상인 상태에서 차트 포인트 클릭 → 팝업 표시
- [ ] 팝업에 해당 스냅샷 날짜·시간과 금액 표시
- [ ] [취소] 클릭 → 팝업 닫힘, 스냅샷 유지
- [ ] [삭제] 클릭 → 팝업 닫힘, 차트에서 포인트 즉시 사라짐, 토스트 5초 표시
- [ ] 토스트의 [되돌리기] 클릭 → 포인트 원래 위치에 복원
- [ ] 토스트 5초 경과 후 자동 사라짐 → 삭제 확정
- [ ] 차트 빈 영역 클릭 → 열려있던 팝업 닫힘
- [ ] 팝업 열린 상태에서 다른 포인트 클릭 → 새 팝업으로 교체
