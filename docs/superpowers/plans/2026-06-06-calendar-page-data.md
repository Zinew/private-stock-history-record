# CalendarPage 실적·이벤트 데이터 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보유 USD 종목의 향후 90일 실적·배당 이벤트를 Finnhub API로 가져와 CalendarPage에 날짜순 리스트로 표시한다.

**Architecture:** `useCalendarEvents` 훅이 Finnhub earnings-calendar + dividend 엔드포인트를 종목별로 병렬 호출하고 통합·정렬된 events 배열을 반환한다. CalendarPage는 훅을 사용해 이벤트 리스트를 렌더링한다. App.jsx는 CalendarPage에 portfolio prop을 추가로 전달한다.

**Tech Stack:** React hooks (useState, useEffect), Finnhub REST API (브라우저 직접 호출, 기존 VITE_FINNHUB_KEY 사용), Vitest + @testing-library/react

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/utils/finnhub.js` | `fetchEarnings`, `fetchDividends` 함수 추가 |
| Modify | `src/__tests__/finnhub.test.js` | 두 함수 테스트 추가 |
| Create | `src/hooks/useCalendarEvents.js` | 이벤트 fetch + 변환 훅 |
| Create | `src/__tests__/hooks/useCalendarEvents.test.js` | 훅 테스트 7개 |
| Modify | `src/index.css` | `calendar-*` CSS 클래스 추가 |
| Modify | `src/pages/CalendarPage.jsx` | 전체 교체 — 실제 UI |
| Modify | `src/App.jsx` | `<CalendarPage portfolio={portfolio} />` prop 추가 |

---

### Task 1: Establish baseline

**Files:** run test suite only

- [ ] **Step 1: Run tests**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)` across 11 files.

---

### Task 2: Add fetchEarnings and fetchDividends to finnhub.js

**Files:**
- Modify: `src/utils/finnhub.js`
- Modify: `src/__tests__/finnhub.test.js`

- [ ] **Step 1: Update import and append tests to `src/__tests__/finnhub.test.js`**

Import 줄을 교체한다:

```js
// Before
import { fetchQuote } from '../utils/finnhub.js'

// After
import { fetchQuote, fetchEarnings, fetchDividends } from '../utils/finnhub.js'
```

그 다음, 파일 맨 끝에 두 describe 블록을 추가한다:

```js
describe('fetchEarnings', () => {
  it('returns earningsCalendar array when API succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ earningsCalendar: [{ date: '2026-06-10', epsEstimate: 1.58, symbol: 'AAPL' }] }),
    })
    const result = await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', 'test-key')
    expect(result).toEqual([{ date: '2026-06-10', epsEstimate: 1.58, symbol: 'AAPL' }])
  })

  it('returns empty array when earningsCalendar is missing from response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    })
    expect(await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when apiKey is empty string', async () => {
    expect(await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', '')).toEqual([])
  })
})

describe('fetchDividends', () => {
  it('returns dividend array when API succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve([{ exDividendDate: '2026-06-15', amount: 0.75, symbol: 'MSFT' }]),
    })
    const result = await fetchDividends('MSFT', '2026-06-06', '2026-09-04', 'test-key')
    expect(result).toEqual([{ exDividendDate: '2026-06-15', amount: 0.75, symbol: 'MSFT' }])
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'not found' }),
    })
    expect(await fetchDividends('MSFT', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchDividends('MSFT', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when apiKey is empty string', async () => {
    expect(await fetchDividends('MSFT', '2026-06-06', '2026-09-04', '')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests — expect 8 failures for new tests**

```bash
npm test -- --run
```

Expected: 96 기존 테스트 통과 + 8개 새 실패 (`fetchEarnings is not a function`).

- [ ] **Step 3: Add fetchEarnings and fetchDividends to `src/utils/finnhub.js`**

기존 `fetchQuote` 함수 아래에 추가 (기존 코드 변경 없음):

```js
export async function fetchEarnings(ticker, from, to, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/earnings-calendar?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    return data.earningsCalendar ?? []
  } catch {
    return []
  }
}

export async function fetchDividends(ticker, from, to, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/dividend?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run tests — expect 104 passing (96 + 8)**

```bash
npm test -- --run
```

Expected: `Tests  104 passed (104)`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/finnhub.js src/__tests__/finnhub.test.js
git commit -m "feat: add fetchEarnings and fetchDividends to finnhub utils"
```

---

### Task 3: Create useCalendarEvents hook

**Files:**
- Create: `src/hooks/useCalendarEvents.js`
- Create: `src/__tests__/hooks/useCalendarEvents.test.js`

- [ ] **Step 1: Create `src/__tests__/hooks/useCalendarEvents.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCalendarEvents } from '../../hooks/useCalendarEvents.js'
import * as finnhub from '../../utils/finnhub.js'

vi.mock('../../utils/finnhub.js', () => ({
  fetchEarnings: vi.fn(),
  fetchDividends: vi.fn(),
}))

describe('useCalendarEvents', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty events immediately when holdings is empty', async () => {
    const { result } = renderHook(() => useCalendarEvents([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events).toEqual([])
    expect(result.current.error).toBeNull()
    expect(finnhub.fetchEarnings).not.toHaveBeenCalled()
  })

  it('ignores KRW holdings and only fetches for USD', async () => {
    finnhub.fetchEarnings.mockResolvedValue([])
    finnhub.fetchDividends.mockResolvedValue([])
    const holdings = [
      { t: 'AAPL', nm: 'Apple', currency: 'USD' },
      { t: '005930', nm: '삼성전자', currency: 'KRW' },
    ]
    const { result } = renderHook(() => useCalendarEvents(holdings))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(finnhub.fetchEarnings).toHaveBeenCalledTimes(1)
    expect(finnhub.fetchEarnings).toHaveBeenCalledWith('AAPL', expect.any(String), expect.any(String))
  })

  it('maps earnings to event objects with correct shape', async () => {
    finnhub.fetchEarnings.mockResolvedValue([{ date: '2026-06-10', epsEstimate: 1.58 }])
    finnhub.fetchDividends.mockResolvedValue([])
    const { result } = renderHook(() =>
      useCalendarEvents([{ t: 'AAPL', nm: 'Apple Inc.', currency: 'USD' }])
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events).toEqual([
      { date: '2026-06-10', type: 'earnings', ticker: 'AAPL', name: 'Apple Inc.', epsEstimate: 1.58, amount: null },
    ])
  })

  it('maps dividends to event objects with correct shape', async () => {
    finnhub.fetchEarnings.mockResolvedValue([])
    finnhub.fetchDividends.mockResolvedValue([{ exDividendDate: '2026-06-15', amount: 0.75 }])
    const { result } = renderHook(() =>
      useCalendarEvents([{ t: 'MSFT', nm: 'Microsoft', currency: 'USD' }])
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events).toEqual([
      { date: '2026-06-15', type: 'dividend', ticker: 'MSFT', name: 'Microsoft', epsEstimate: null, amount: 0.75 },
    ])
  })

  it('sorts events by date ascending', async () => {
    finnhub.fetchEarnings.mockResolvedValue([{ date: '2026-07-01', epsEstimate: null }])
    finnhub.fetchDividends.mockResolvedValue([{ exDividendDate: '2026-06-15', amount: 0.5 }])
    const { result } = renderHook(() =>
      useCalendarEvents([{ t: 'AAPL', nm: 'Apple', currency: 'USD' }])
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events[0].date).toBe('2026-06-15')
    expect(result.current.events[1].date).toBe('2026-07-01')
  })

  it('sets error when a fetch throws unexpectedly', async () => {
    finnhub.fetchEarnings.mockRejectedValue(new Error('unexpected'))
    finnhub.fetchDividends.mockResolvedValue([])
    const { result } = renderHook(() =>
      useCalendarEvents([{ t: 'AAPL', nm: 'Apple', currency: 'USD' }])
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('이벤트 데이터 조회에 실패했습니다')
    expect(result.current.events).toEqual([])
  })

  it('uses ticker as name when nm is absent', async () => {
    finnhub.fetchEarnings.mockResolvedValue([{ date: '2026-06-10', epsEstimate: null }])
    finnhub.fetchDividends.mockResolvedValue([])
    const { result } = renderHook(() =>
      useCalendarEvents([{ t: 'AAPL', currency: 'USD' }])
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events[0].name).toBe('AAPL')
  })

  it('treats undefined currency as USD and fetches data', async () => {
    finnhub.fetchEarnings.mockResolvedValue([])
    finnhub.fetchDividends.mockResolvedValue([])
    const { result } = renderHook(() =>
      useCalendarEvents([{ t: 'TSLA', nm: 'Tesla' }])
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(finnhub.fetchEarnings).toHaveBeenCalledWith('TSLA', expect.any(String), expect.any(String))
  })
})
```

- [ ] **Step 2: Run tests — expect 8 failures for new tests**

```bash
npm test -- --run
```

Expected: 104 기존 테스트 통과 + 8개 새 실패 (`useCalendarEvents is not a function`).

- [ ] **Step 3: Create `src/hooks/useCalendarEvents.js`**

```js
import { useState, useEffect } from 'react'
import { fetchEarnings, fetchDividends } from '../utils/finnhub.js'

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

export function useCalendarEvents(holdings) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const usdHoldings = holdings.filter(h => (h.currency ?? 'USD') === 'USD')
    if (usdHoldings.length === 0) {
      setEvents([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const from = dateStr(new Date())
    const toDate = new Date()
    toDate.setDate(toDate.getDate() + 90)
    const to = dateStr(toDate)

    ;(async () => {
      try {
        const perHolding = await Promise.all(
          usdHoldings.map(async h => {
            const [earnings, dividends] = await Promise.all([
              fetchEarnings(h.t, from, to),
              fetchDividends(h.t, from, to),
            ])
            const name = h.nm || h.t
            return [
              ...earnings.map(e => ({
                date: e.date,
                type: 'earnings',
                ticker: h.t,
                name,
                epsEstimate: e.epsEstimate ?? null,
                amount: null,
              })),
              ...dividends.map(d => ({
                date: d.exDividendDate,
                type: 'dividend',
                ticker: h.t,
                name,
                epsEstimate: null,
                amount: d.amount ?? null,
              })),
            ]
          })
        )
        const all = perHolding
          .flat()
          .filter(e => e.date)
          .sort((a, b) => a.date.localeCompare(b.date))
        setEvents(all)
      } catch {
        setError('이벤트 데이터 조회에 실패했습니다')
        setEvents([])
      } finally {
        setLoading(false)
      }
    })()
  }, [holdings])

  return { events, loading, error }
}
```

- [ ] **Step 4: Run tests — expect 112 passing (104 + 8)**

```bash
npm test -- --run
```

Expected: `Tests  112 passed (112)`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCalendarEvents.js src/__tests__/hooks/useCalendarEvents.test.js
git commit -m "feat: add useCalendarEvents hook"
```

---

### Task 4: CSS classes + CalendarPage UI + App.jsx prop

**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/CalendarPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Append calendar CSS classes to end of `src/index.css`**

```css
/* ── CalendarPage ── */

.calendar-heading {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink-dim);
  margin: 0 0 20px;
}

.calendar-list {
  display: flex;
  flex-direction: column;
}

.calendar-date-header {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 20px 0 8px;
}

.calendar-date-header:first-child {
  margin-top: 0;
}

.calendar-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 6px;
}

.calendar-badge {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 2px;
}

.calendar-badge.earnings {
  background: rgba(63, 191, 143, 0.15);
  color: #3fbf8f;
}

.calendar-badge.dividend {
  background: rgba(100, 149, 237, 0.15);
  color: #6495ed;
}

.calendar-card-info {
  flex: 1;
}

.calendar-card-ticker {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 12px;
  color: var(--ink);
}

.calendar-card-name {
  font-size: 11px;
  color: var(--ink-dim);
  margin-left: 6px;
}

.calendar-card-detail {
  font-size: 11px;
  color: var(--ink-faint);
  margin-top: 3px;
}

.calendar-empty {
  font-size: 12px;
  color: var(--ink-faint);
  text-align: center;
  padding: 32px 0;
}

.calendar-note {
  font-size: 11px;
  color: var(--ink-faint);
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
```

- [ ] **Step 2: Replace `src/pages/CalendarPage.jsx` entirely**

```jsx
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'

export default function CalendarPage({ portfolio }) {
  const holdings = portfolio?.holdings ?? []
  const { events, loading, error } = useCalendarEvents(holdings)
  const hasKrw = holdings.some(h => h.currency === 'KRW')

  const grouped = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  return (
    <div className="holdings">
      <h2 className="calendar-heading">실적·이벤트 캘린더</h2>

      {loading && <p className="calendar-empty">조회 중…</p>}
      {error && <div className="price-error">⚠ {error}</div>}

      {!loading && !error && events.length === 0 && (
        <p className="calendar-empty">향후 90일 내 예정된 이벤트가 없습니다.</p>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="calendar-list">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="calendar-date-header">{date}</div>
              {dayEvents.map((ev, i) => (
                <div key={i} className="calendar-card">
                  <span className={`calendar-badge ${ev.type}`}>
                    {ev.type === 'earnings' ? '실적' : '배당'}
                  </span>
                  <div className="calendar-card-info">
                    <div>
                      <span className="calendar-card-ticker">{ev.ticker}</span>
                      {ev.name !== ev.ticker && (
                        <span className="calendar-card-name">{ev.name}</span>
                      )}
                    </div>
                    {ev.type === 'earnings' && ev.epsEstimate !== null && (
                      <div className="calendar-card-detail">예상 EPS: ${ev.epsEstimate}</div>
                    )}
                    {ev.type === 'dividend' && ev.amount !== null && (
                      <div className="calendar-card-detail">${ev.amount} / 주</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {hasKrw && (
        <p className="calendar-note">* 한국 종목 이벤트는 추후 지원 예정입니다.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `src/App.jsx` — pass portfolio prop to CalendarPage**

Find:
```jsx
        <Route path="/calendar" element={<CalendarPage />} />
```
Replace with:
```jsx
        <Route path="/calendar" element={<CalendarPage portfolio={portfolio} />} />
```

- [ ] **Step 4: Run tests — expect 112 passing**

```bash
npm test -- --run
```

Expected: `Tests  112 passed (112)`. CSS/JSX 변경은 기존 테스트에 영향 없음.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/pages/CalendarPage.jsx src/App.jsx
git commit -m "feat: implement CalendarPage with earnings and dividend events"
```

---

### Task 5: Final verification

**Files:** verify only

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --run
```

Expected: `Tests  112 passed (112)`.

- [ ] **Step 2: Verify no inline styles in CalendarPage**

```bash
grep "style={{" src/pages/CalendarPage.jsx
```

Expected: 출력 없음.

- [ ] **Step 3: Verify portfolio prop is wired in App.jsx**

```bash
grep "CalendarPage" src/App.jsx
```

Expected 출력:
```
import CalendarPage from './pages/CalendarPage.jsx'
        <Route path="/calendar" element={<CalendarPage portfolio={portfolio} />} />
```
