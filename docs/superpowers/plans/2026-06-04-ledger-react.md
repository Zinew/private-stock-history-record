# Ledger React App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Ledger HTML 단일 파일을 Vite + React SPA로 전환하고 GitHub + Cloudflare Pages로 배포한다.

**Architecture:** App.jsx가 holdings/snaps 상태를 보유하고 4개 컴포넌트(Header, Charts, HoldingsTable, SnapshotBar)에 props로 전달. useLocalStorage 훅이 상태 변경 시 자동으로 localStorage에 동기화.

**Tech Stack:** Vite, React, react-chartjs-2, chart.js, Vitest, @testing-library/react

---

## 파일 구조

```
D:\BEBIG\livenow\
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Charts.jsx
│   │   ├── HoldingsTable.jsx
│   │   └── SnapshotBar.jsx
│   ├── hooks/
│   │   └── useLocalStorage.js
│   └── utils/
│       └── format.js
├── src/__tests__/
│   ├── format.test.js
│   ├── useLocalStorage.test.js
│   └── components/
│       ├── Header.test.jsx
│       ├── HoldingsTable.test.jsx
│       └── SnapshotBar.test.jsx
├── index.html
├── vite.config.js
└── package.json
```

---

## Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `src/main.jsx`, `src/App.jsx`, `index.html`, `vite.config.js`, `package.json`

- [ ] **Step 1: Vite React 프로젝트 생성**

```powershell
cd D:\BEBIG\livenow
npm create vite@latest . -- --template react
```

`현재 디렉토리에 파일이 있다`는 경고가 나오면 `y`로 진행.

- [ ] **Step 2: 의존성 설치**

```powershell
npm install
npm install chart.js react-chartjs-2
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: vite.config.js에 테스트 설정 추가**

`vite.config.js`를 다음으로 교체:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    globals: true,
  },
})
```

- [ ] **Step 4: 테스트 setup 파일 생성**

`src/__tests__/setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: package.json scripts에 test 추가**

`package.json`의 `scripts` 섹션에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 불필요한 Vite 기본 파일 삭제**

```powershell
Remove-Item src/App.css -ErrorAction SilentlyContinue
Remove-Item src/assets -Recurse -ErrorAction SilentlyContinue
```

- [ ] **Step 7: 커밋**

```powershell
git add .
git commit -m "chore: scaffold Vite React project"
```

---

## Task 2: 전역 CSS

**Files:**
- Create: `src/index.css`
- Modify: `src/main.jsx`

- [ ] **Step 1: src/index.css 작성**

기존 HTML에서 CSS 전체 이동:

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Spline+Sans+Mono:wght@400;500;600&family=Spline+Sans:wght@400;500;600;700&display=swap');

:root {
  --bg: #0c0e0d;
  --panel: #141816;
  --panel-2: #1a201d;
  --line: #27302c;
  --ink: #e9ece9;
  --ink-dim: #8a958e;
  --ink-faint: #5c6660;
  --gain: #3fbf8f;
  --loss: #e8654f;
  --gold: #d4b483;
  --accent: #7fd1ae;
}

* { box-sizing: border-box; margin: 0; padding: 0 }

body {
  background:
    radial-gradient(1200px 600px at 80% -10%, rgba(127,209,174,.07), transparent 60%),
    var(--bg);
  color: var(--ink);
  font-family: 'Spline Sans', sans-serif;
  min-height: 100vh;
  padding: 32px 24px 80px;
}

.wrap { max-width: 1120px; margin: 0 auto }

header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  padding-bottom: 20px;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.brand { display: flex; align-items: baseline; gap: 12px }
.brand h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 34px; letter-spacing: -.5px }
.brand .dot { color: var(--gold) }
.brand span.tag {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 11px;
  color: var(--ink-faint);
  text-transform: uppercase;
  letter-spacing: 2px;
  padding-bottom: 6px;
}

.summary { display: flex; gap: 36px; flex-wrap: wrap }
.sum-item .label {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 4px;
}
.sum-item .val {
  font-family: 'Fraunces', serif;
  font-size: 26px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.pos { color: var(--gain) }
.neg { color: var(--loss) }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px }
@media (max-width: 840px) { .grid { grid-template-columns: 1fr } }
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 22px;
}
.card h2 {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink-dim);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chart-box { position: relative; height: 240px }

.holdings {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 20px;
  overflow-x: auto;
}
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums }
th {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--ink-faint);
  text-align: right;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  font-weight: 500;
}
th:first-child { text-align: left }
td {
  padding: 13px 12px;
  text-align: right;
  font-size: 14px;
  border-bottom: 1px solid rgba(39,48,44,.5);
}
td:first-child { text-align: left }
tr:last-child td { border-bottom: none }
.tick { font-family: 'Spline Sans Mono', monospace; font-weight: 600; font-size: 14px; letter-spacing: .5px }
.tick small {
  display: block;
  color: var(--ink-faint);
  font-weight: 400;
  font-size: 11px;
  letter-spacing: 0;
  margin-top: 2px;
  font-family: 'Spline Sans', sans-serif;
}
.del {
  background: none;
  border: none;
  color: var(--ink-faint);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
  transition: .15s;
}
.del:hover { color: var(--loss); background: rgba(232,101,79,.1) }
.empty { text-align: center; color: var(--ink-faint); padding: 30px; font-size: 14px }

.addbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.field { display: flex; flex-direction: column; gap: 5px }
.field label {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.field input {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  padding: 9px 11px;
  font-family: 'Spline Sans Mono', monospace;
  font-size: 13px;
  width: 108px;
}
.field.tk input { width: 88px; text-transform: uppercase }
.field.nm input { width: 150px }
.field input:focus { outline: none; border-color: var(--accent) }
.btn {
  background: var(--accent);
  color: #0c0e0d;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-family: 'Spline Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: .15s;
  height: 38px;
}
.btn:hover { background: #9ee0c4 }
.btn.ghost { background: transparent; border: 1px solid var(--line); color: var(--ink-dim) }
.btn.ghost:hover { border-color: var(--accent); color: var(--accent) }

.snapbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap }
.snapbar .note {
  font-size: 12px;
  color: var(--ink-faint);
  max-width: 380px;
  line-height: 1.5;
}

footer {
  margin-top: 30px;
  text-align: center;
  font-size: 11px;
  color: var(--ink-faint);
  font-family: 'Spline Sans Mono', monospace;
  letter-spacing: .5px;
  line-height: 1.7;
}
```

- [ ] **Step 2: src/main.jsx 작성**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: 개발 서버 실행해서 빈 화면 확인**

```powershell
npm run dev
```

브라우저에서 `http://localhost:5173` 열기. 검은 배경 빈 페이지가 보이면 정상.

- [ ] **Step 4: 커밋**

```powershell
git add src/index.css src/main.jsx
git commit -m "style: add global CSS from original HTML"
```

---

## Task 3: 포맷 유틸 함수

**Files:**
- Create: `src/utils/format.js`
- Create: `src/__tests__/format.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/format.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { fmt, pct } from '../utils/format.js'

describe('fmt', () => {
  it('양수를 $X,XXX.XX 형식으로 변환', () => {
    expect(fmt(1234.5)).toBe('$1,234.50')
  })
  it('0을 $0.00으로 변환', () => {
    expect(fmt(0)).toBe('$0.00')
  })
  it('음수를 -$X,XXX.XX 형식으로 변환', () => {
    expect(fmt(-400)).toBe('-$400.00')
  })
})

describe('pct', () => {
  it('양수에 + 접두사 붙이기', () => {
    expect(pct(10.96)).toBe('+10.96%')
  })
  it('음수 그대로 표시', () => {
    expect(pct(-5.5)).toBe('-5.50%')
  })
  it('0은 +0.00% 표시', () => {
    expect(pct(0)).toBe('+0.00%')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm test
```

Expected: `Cannot find module '../utils/format.js'`

- [ ] **Step 3: format.js 구현**

`src/utils/format.js`:

```js
export const fmt = n =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const pct = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
npm test
```

Expected: 6 tests pass

- [ ] **Step 5: 커밋**

```powershell
git add src/utils/format.js src/__tests__/format.test.js
git commit -m "feat: add fmt and pct utility functions"
```

---

## Task 4: useLocalStorage 훅

**Files:**
- Create: `src/hooks/useLocalStorage.js`
- Create: `src/__tests__/useLocalStorage.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/useLocalStorage.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalStorage', () => {
  it('초기값 반환', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', []))
    expect(result.current[0]).toEqual([])
  })

  it('localStorage에 저장된 값 불러오기', () => {
    localStorage.setItem('test_key', JSON.stringify([{ id: 1 }]))
    const { result } = renderHook(() => useLocalStorage('test_key', []))
    expect(result.current[0]).toEqual([{ id: 1 }])
  })

  it('값 변경 시 localStorage에 저장', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', []))
    act(() => {
      result.current[1]([{ id: 2 }])
    })
    expect(JSON.parse(localStorage.getItem('test_key'))).toEqual([{ id: 2 }])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm test
```

Expected: `Cannot find module '../hooks/useLocalStorage.js'`

- [ ] **Step 3: useLocalStorage 구현**

`src/hooks/useLocalStorage.js`:

```js
import { useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setStoredValue = newValue => {
    setValue(newValue)
    localStorage.setItem(key, JSON.stringify(newValue))
  }

  return [value, setStoredValue]
}
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
npm test
```

Expected: 9 tests pass (이전 6 + 새 3)

- [ ] **Step 5: 커밋**

```powershell
git add src/hooks/useLocalStorage.js src/__tests__/useLocalStorage.test.js
git commit -m "feat: add useLocalStorage hook"
```

---

## Task 5: App.jsx — 루트 컴포넌트

**Files:**
- Create: `src/App.jsx`

- [ ] **Step 1: Chart.js 컴포넌트 등록 + App.jsx 작성**

`src/App.jsx`:

```jsx
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import Header from './components/Header.jsx'
import Charts from './components/Charts.jsx'
import HoldingsTable from './components/HoldingsTable.jsx'
import SnapshotBar from './components/SnapshotBar.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export default function App() {
  const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])

  const totalVal = holdings.reduce((s, h) => s + h.q * h.c, 0)
  const totalCost = holdings.reduce((s, h) => s + h.q * h.b, 0)
  const pl = totalVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0

  function addHolding({ t, nm, q, b, c }) {
    setHoldings([...holdings, { t, nm, q, b, c }])
  }

  function delHolding(i) {
    setHoldings(holdings.filter((_, idx) => idx !== i))
  }

  function takeSnapshot() {
    if (holdings.length === 0) { alert('먼저 종목을 추가해 주세요.'); return }
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const next = [...snaps, { label, total: totalVal }]
    setSnaps(next.length > 60 ? next.slice(-60) : next)
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  return (
    <div className="wrap">
      <Header totalVal={totalVal} totalCost={totalCost} pl={pl} ret={ret} />
      <Charts holdings={holdings} snaps={snaps} totalVal={totalVal} />
      <HoldingsTable
        holdings={holdings}
        totalVal={totalVal}
        onAdd={addHolding}
        onDelete={delHolding}
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

- [ ] **Step 2: 임시 컴포넌트 스텁 생성 (다음 Task 전까지 오류 방지)**

`src/components/Header.jsx`:
```jsx
export default function Header() { return null }
```

`src/components/Charts.jsx`:
```jsx
export default function Charts() { return null }
```

`src/components/HoldingsTable.jsx`:
```jsx
export default function HoldingsTable() { return null }
```

`src/components/SnapshotBar.jsx`:
```jsx
export default function SnapshotBar() { return null }
```

- [ ] **Step 3: 개발 서버에서 오류 없이 렌더링 확인**

```powershell
npm run dev
```

브라우저에서 `http://localhost:5173` — 빈 검은 화면, 콘솔 에러 없으면 정상.

- [ ] **Step 4: 커밋**

```powershell
git add src/App.jsx src/components/
git commit -m "feat: add App root with state and stub components"
```

---

## Task 6: Header 컴포넌트

**Files:**
- Modify: `src/components/Header.jsx`
- Create: `src/__tests__/components/Header.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/Header.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from '../../components/Header.jsx'

describe('Header', () => {
  it('브랜드 이름 Ledger 표시', () => {
    render(<Header totalVal={0} totalCost={0} pl={0} ret={0} />)
    expect(screen.getByText(/Ledger/)).toBeInTheDocument()
  })

  it('총 평가액 표시', () => {
    render(<Header totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    expect(screen.getByText('$12,450.00')).toBeInTheDocument()
  })

  it('양수 손익에 pos 클래스 적용', () => {
    render(<Header totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    const plEl = screen.getByText('+$2,450.00')
    expect(plEl).toHaveClass('pos')
  })

  it('음수 손익에 neg 클래스 적용', () => {
    render(<Header totalVal={8000} totalCost={10000} pl={-2000} ret={-20} />)
    const plEl = screen.getByText('-$2,000.00')
    expect(plEl).toHaveClass('neg')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm test
```

Expected: 4 tests fail

- [ ] **Step 3: Header.jsx 구현**

`src/components/Header.jsx`:

```jsx
import { fmt, pct } from '../utils/format.js'

export default function Header({ totalVal, totalCost, pl, ret }) {
  return (
    <header>
      <div className="brand">
        <h1>Ledger<span className="dot">.</span></h1>
        <span className="tag">portfolio tracker · v1</span>
      </div>
      <div className="summary">
        <div className="sum-item">
          <div className="label">총 평가액</div>
          <div className="val">{fmt(totalVal)}</div>
        </div>
        <div className="sum-item">
          <div className="label">총 매입액</div>
          <div className="val">{fmt(totalCost)}</div>
        </div>
        <div className="sum-item">
          <div className="label">평가손익</div>
          <div className={`val ${pl >= 0 ? 'pos' : 'neg'}`}>{fmt(pl)}</div>
        </div>
        <div className="sum-item">
          <div className="label">수익률</div>
          <div className={`val ${ret >= 0 ? 'pos' : 'neg'}`}>{pct(ret)}</div>
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

- [ ] **Step 5: 브라우저에서 헤더 확인**

```powershell
npm run dev
```

`http://localhost:5173` — Ledger. 브랜드와 $0.00 요약이 보이면 정상.

- [ ] **Step 6: 커밋**

```powershell
git add src/components/Header.jsx src/__tests__/components/Header.test.jsx
git commit -m "feat: add Header component"
```

---

## Task 7: Charts 컴포넌트

**Files:**
- Modify: `src/components/Charts.jsx`

(Chart.js 캔버스는 DOM에 직접 의존하므로 vitest 환경에서 완전한 테스트가 어렵다. 렌더링 통합 확인으로 대체한다.)

- [ ] **Step 1: Charts.jsx 구현**

`src/components/Charts.jsx`:

```jsx
import { Line, Doughnut } from 'react-chartjs-2'
import { fmt } from '../utils/format.js'

const PALETTE = ['#7fd1ae','#d4b483','#e8654f','#6aa9d8','#b98fd1','#d8c46a','#5fb0a0','#d88f9e','#9ed86a','#888']

function getGradient(ctx, chartArea, isUp) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, isUp ? 'rgba(63,191,143,.28)' : 'rgba(232,101,79,.28)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  return gradient
}

export default function Charts({ holdings, snaps, totalVal }) {
  const labels = snaps.map(s => s.label)
  const data = snaps.map(s => s.total)
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
      tooltip: { callbacks: { label: c => ' ' + fmt(c.parsed.y) } },
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
          callback: v => '$' + v.toLocaleString(),
        },
      },
    },
  }

  const pieData = {
    labels: holdings.map(h => h.t),
    datasets: [{
      data: holdings.map(h => h.q * h.c),
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
          label: c => ` ${c.label}: ${fmt(c.parsed)} (${totalVal > 0 ? (c.parsed / totalVal * 100).toFixed(1) : 0}%)`,
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

- [ ] **Step 2: 브라우저에서 차트 확인**

```powershell
npm run dev
```

`http://localhost:5173` — 두 개의 빈 차트 카드가 보이면 정상.

- [ ] **Step 3: 커밋**

```powershell
git add src/components/Charts.jsx
git commit -m "feat: add Charts component with Line and Doughnut charts"
```

---

## Task 8: HoldingsTable 컴포넌트

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Create: `src/__tests__/components/HoldingsTable.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/HoldingsTable.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HoldingsTable from '../../components/HoldingsTable.jsx'

const mockHoldings = [
  { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190 },
]

describe('HoldingsTable', () => {
  it('종목 없을 때 빈 안내 메시지 표시', () => {
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/종목이 없습니다/)).toBeInTheDocument()
  })

  it('종목 티커 표시', () => {
    render(<HoldingsTable holdings={mockHoldings} totalVal={1900} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 onDelete 호출', () => {
    const onDelete = vi.fn()
    render(<HoldingsTable holdings={mockHoldings} totalVal={1900} onAdd={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByTitle('삭제'))
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('폼 입력 후 추가 버튼 클릭 시 onAdd 호출', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={onAdd} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: 'TSLA' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '200' } })
    fireEvent.change(screen.getByPlaceholderText('190'), { target: { value: '250' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: 'TSLA', nm: '', q: 5, b: 200, c: 250 })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm test
```

Expected: 4 tests fail

- [ ] **Step 3: HoldingsTable.jsx 구현**

`src/components/HoldingsTable.jsx`:

```jsx
import { useState } from 'react'
import { fmt, pct } from '../utils/format.js'

export default function HoldingsTable({ holdings, totalVal, onAdd, onDelete }) {
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '' })

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
    onAdd({ t, nm, q, b, c })
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '' })
  }

  return (
    <div className="holdings">
      <h2 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14 }}>
        보유 종목
      </h2>
      <table>
        <thead>
          <tr>
            <th>종목</th><th>수량</th><th>매수가</th><th>현재가</th>
            <th>평가액</th><th>손익</th><th>수익률</th><th>비중</th><th></th>
          </tr>
        </thead>
        <tbody>
          {holdings.length === 0 ? (
            <tr><td colSpan={9} className="empty">아직 종목이 없습니다. 아래에서 첫 종목을 추가해 보세요.</td></tr>
          ) : (
            holdings.map((h, i) => {
              const val = h.q * h.c
              const cost = h.q * h.b
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
                  <td>{fmt(h.b)}</td>
                  <td>{fmt(h.c)}</td>
                  <td>{fmt(val)}</td>
                  <td className={p >= 0 ? 'pos' : 'neg'}>{fmt(p)}</td>
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
            type="number" step="any" placeholder="150"
            value={form.buy}
            onChange={e => setForm(f => ({ ...f, buy: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>현재가</label>
          <input
            type="number" step="any" placeholder="190"
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

- [ ] **Step 5: 브라우저에서 종목 추가/삭제 동작 확인**

```powershell
npm run dev
```

`http://localhost:5173` — 종목 추가해보고, 삭제 버튼 눌러서 잘 동작하는지 확인.

- [ ] **Step 6: 커밋**

```powershell
git add src/components/HoldingsTable.jsx src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: add HoldingsTable component with add/delete form"
```

---

## Task 9: SnapshotBar 컴포넌트

**Files:**
- Modify: `src/components/SnapshotBar.jsx`
- Create: `src/__tests__/components/SnapshotBar.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/SnapshotBar.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SnapshotBar from '../../components/SnapshotBar.jsx'

describe('SnapshotBar', () => {
  it('두 버튼 렌더링', () => {
    render(<SnapshotBar onSnapshot={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText(/오늘 자산 기록하기/)).toBeInTheDocument()
    expect(screen.getByText('추이 초기화')).toBeInTheDocument()
  })

  it('기록 버튼 클릭 시 onSnapshot 호출', () => {
    const onSnapshot = vi.fn()
    render(<SnapshotBar onSnapshot={onSnapshot} onClear={vi.fn()} />)
    fireEvent.click(screen.getByText(/오늘 자산 기록하기/))
    expect(onSnapshot).toHaveBeenCalledOnce()
  })

  it('초기화 버튼 클릭 시 onClear 호출', () => {
    const onClear = vi.fn()
    render(<SnapshotBar onSnapshot={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByText('추이 초기화'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm test
```

Expected: 3 tests fail

- [ ] **Step 3: SnapshotBar.jsx 구현**

`src/components/SnapshotBar.jsx`:

```jsx
export default function SnapshotBar({ onSnapshot, onClear }) {  // hasHoldings check is handled by App
  return (
    <div className="card snapbar" style={{ marginBottom: 20 }}>
      <button className="btn ghost" onClick={onSnapshot}>📸 오늘 자산 기록하기</button>
      <button className="btn ghost" onClick={onClear}>추이 초기화</button>
      <span className="note">
        버튼을 누를 때마다 현재 총 평가액이 추이 그래프에 점으로 쌓입니다.
        며칠에 걸쳐 눌러두면 상승/하락 이력이 그려져요.
      </span>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
npm test
```

Expected: 모든 테스트 pass

- [ ] **Step 5: 브라우저 전체 동작 확인**

```powershell
npm run dev
```

다음을 모두 확인:
1. 종목 추가 → 요약 통계 업데이트, 파이 차트 반영
2. 📸 버튼 클릭 → 라인 차트에 점 추가
3. 페이지 새로고침 → 데이터 유지 (localStorage)
4. 삭제 버튼 → 종목 제거

- [ ] **Step 6: 커밋**

```powershell
git add src/components/SnapshotBar.jsx src/__tests__/components/SnapshotBar.test.jsx
git commit -m "feat: add SnapshotBar component"
```

---

## Task 10: .gitignore + Cloudflare Pages 배포 설정

**Files:**
- Modify: `.gitignore`
- Create: `public/_redirects` (SPA 라우팅 대비)

- [ ] **Step 1: .gitignore 확인 및 .superpowers 추가**

`.gitignore`에 다음 항목이 있는지 확인하고 없으면 추가:

```
# Superpowers brainstorm files
.superpowers/
```

- [ ] **Step 2: SPA 리다이렉트 파일 생성**

`public/_redirects`:

```
/* /index.html 200
```

- [ ] **Step 3: 빌드 확인**

```powershell
npm run build
```

`dist/` 폴더가 생성되고 `dist/index.html`, `dist/assets/` 가 있으면 정상.

- [ ] **Step 4: 최종 커밋 및 push**

```powershell
git add .gitignore public/_redirects
git commit -m "chore: add gitignore and Cloudflare Pages redirect"
git push origin main
```

- [ ] **Step 5: Cloudflare Pages 연결**

1. [dash.cloudflare.com](https://dash.cloudflare.com) 로그인
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. GitHub 계정 연결 → `private-stock-history-record` 저장소 선택
4. 빌드 설정:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. **Save and Deploy**

배포 완료 후 `https://private-stock-history-record.pages.dev` (또는 유사 URL)에서 앱 확인.

이후 `main` 브랜치에 push할 때마다 자동으로 재배포됩니다.
