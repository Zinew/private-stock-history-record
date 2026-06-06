# CalendarPage 수동 이벤트 입력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CalendarPage에 수동 이벤트 섹션을 추가해, 보유 종목 중 API에 없는 종목의 실적발표일·배당금 지급일을 사용자가 직접 등록·삭제할 수 있게 한다.

**Architecture:** `ledger_manual_events` localStorage 키에 `{ ticker, date, type }` 배열을 저장한다. `ManualEventModal` 컴포넌트가 입력 UI를 담당하고, `CalendarPage`가 자동(Alpha Vantage)과 수동 섹션을 별도로 렌더링한다. 기존 `useLocalStorage` 훅과 CSS 클래스를 재사용한다.

**Tech Stack:** React 18, Vite, localStorage, 기존 CSS 변수 시스템 (`var(--panel)`, `var(--line)` 등)

---

## 파일 구조

| 파일 | 작업 |
|---|---|
| `src/components/ManualEventModal.jsx` | **신규** — 종목 선택, 날짜 피커, 이벤트 타입 토글, 저장/취소 |
| `src/pages/CalendarPage.jsx` | **수정** — manual events 상태, 섹션 분리, 모달 연결 |
| `src/index.css` | **수정** — 섹션 헤더, 삭제 버튼, 타입 토글 CSS 추가 |

---

## Task 1: CSS 추가

**Files:**
- Modify: `src/index.css` (파일 끝에 추가)

- [ ] **Step 1: CSS 클래스 추가**

`src/index.css` 파일 끝 `.calendar-note` 블록 다음에 아래를 추가한다.

```css
.calendar-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32px 0 8px;
}

.calendar-section-label {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.calendar-add-btn {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 5px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
  font-family: 'Spline Sans Mono', monospace;
  transition: background .15s, color .15s;
}
.calendar-add-btn:hover {
  background: var(--accent);
  color: #0c0e0d;
}

.calendar-card-delete {
  background: none;
  border: none;
  color: var(--ink-faint);
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
  line-height: 1;
  border-radius: 3px;
  transition: color .15s;
  flex-shrink: 0;
  align-self: center;
}
.calendar-card-delete:hover { color: #e8654f; }

.type-toggle {
  display: flex;
  gap: 6px;
}
.type-btn {
  flex: 1;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--ink-dim);
  border-radius: 6px;
  padding: 7px 0;
  font-size: 12px;
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}
.type-btn.active.earnings {
  background: rgba(63, 191, 143, 0.15);
  border-color: #3fbf8f;
  color: #3fbf8f;
}
.type-btn.active.dividend {
  background: rgba(100, 149, 237, 0.15);
  border-color: #6495ed;
  color: #6495ed;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.css
git commit -m "style: add manual events CSS classes"
```

---

## Task 2: ManualEventModal 컴포넌트 생성

**Files:**
- Create: `src/components/ManualEventModal.jsx`

- [ ] **Step 1: 파일 생성**

`src/components/ManualEventModal.jsx` 를 아래 내용으로 생성한다.

```jsx
import { useState } from 'react'

export default function ManualEventModal({ holdings, onSave, onClose }) {
  const [ticker, setTicker] = useState(holdings[0]?.t ?? '')
  const [date, setDate] = useState('')
  const [type, setType] = useState('earnings')

  const canSave = ticker && date

  function handleSave() {
    if (!canSave) return
    onSave({ ticker, date, type })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">이벤트 직접 추가</div>

        <div className="modal-field">
          <label>종목</label>
          <select
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            {holdings.map(h => (
              <option key={h.t} value={h.t}>
                {h.t}{h.nm ? ` — ${h.nm}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>날짜</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label>이벤트 종류</label>
          <div className="type-toggle">
            <button
              className={`type-btn${type === 'earnings' ? ' active earnings' : ''}`}
              onClick={() => setType('earnings')}
            >
              실적발표
            </button>
            <button
              className={`type-btn${type === 'dividend' ? ' active dividend' : ''}`}
              onClick={() => setType('dividend')}
            >
              배당금
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={handleSave} disabled={!canSave}>
            저장
          </button>
          <button className="btn ghost" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/ManualEventModal.jsx
git commit -m "feat: add ManualEventModal component"
```

---

## Task 3: CalendarPage 수정

**Files:**
- Modify: `src/pages/CalendarPage.jsx`

- [ ] **Step 1: CalendarPage 전체 교체**

`src/pages/CalendarPage.jsx` 전체를 아래로 교체한다.

```jsx
import { useState } from 'react'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import ManualEventModal from '../components/ManualEventModal.jsx'

export default function CalendarPage({ portfolio }) {
  const holdings = portfolio?.holdings ?? []
  const { events, loading, error } = useCalendarEvents(holdings)
  const hasKrw = holdings.some(h => h.currency === 'KRW')

  const [manualEvents, setManualEvents] = useLocalStorage('ledger_manual_events', [])
  const [showModal, setShowModal] = useState(false)

  const grouped = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  const sortedManual = [...manualEvents].sort((a, b) => a.date.localeCompare(b.date))

  function addManualEvent(ev) {
    setManualEvents([...manualEvents, ev])
  }

  function deleteManualEvent(index) {
    setManualEvents(manualEvents.filter((_, i) => i !== index))
  }

  const usdHoldings = holdings.filter(h => (h.currency ?? 'USD') === 'USD')

  return (
    <div className="holdings">
      <h2 className="calendar-heading">실적·이벤트 캘린더</h2>

      {/* 자동 조회 섹션 */}
      <div className="calendar-section-header">
        <span className="calendar-section-label">자동 조회 이벤트</span>
      </div>

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

      {/* 수동 입력 섹션 */}
      <div className="calendar-section-header">
        <span className="calendar-section-label">내가 추가한 이벤트</span>
        {usdHoldings.length > 0 && (
          <button className="calendar-add-btn" onClick={() => setShowModal(true)}>
            + 추가
          </button>
        )}
      </div>

      {sortedManual.length === 0 && (
        <p className="calendar-empty">직접 추가한 이벤트가 없습니다.</p>
      )}

      {sortedManual.length > 0 && (
        <div className="calendar-list">
          {sortedManual.map((ev, i) => {
            const holding = holdings.find(h => h.t === ev.ticker)
            return (
              <div key={i} className="calendar-card">
                <span className={`calendar-badge ${ev.type}`}>
                  {ev.type === 'earnings' ? '실적' : '배당'}
                </span>
                <div className="calendar-card-info">
                  <div>
                    <span className="calendar-card-ticker">{ev.ticker}</span>
                    {holding?.nm && holding.nm !== ev.ticker && (
                      <span className="calendar-card-name">{holding.nm}</span>
                    )}
                  </div>
                  <div className="calendar-card-detail">{ev.date}</div>
                </div>
                <button
                  className="calendar-card-delete"
                  onClick={() => deleteManualEvent(manualEvents.indexOf(ev))}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {hasKrw && (
        <p className="calendar-note">* 한국 종목 이벤트는 추후 지원 예정입니다.</p>
      )}

      {showModal && (
        <ManualEventModal
          holdings={usdHoldings}
          onSave={addManualEvent}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/CalendarPage.jsx
git commit -m "feat: add manual events section to CalendarPage"
```

---

## Task 4: 앱 실행 확인

- [ ] **Step 1: dev 서버 실행**

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 열기 → 사이드바 → 캘린더 페이지 이동.

- [ ] **Step 2: 수동 이벤트 추가 확인**

1. "내가 추가한 이벤트" 섹션에 `+ 추가` 버튼이 보이는지 확인
2. 클릭 → 모달 오픈 확인
3. 보유 종목 드롭다운에 holdings 목록이 표시되는지 확인
4. 날짜 선택 → 이벤트 타입 선택 → 저장
5. 수동 섹션에 카드가 추가되는지 확인
6. ✕ 버튼으로 삭제 확인
7. 페이지 새로고침 후에도 이벤트가 유지되는지 확인 (localStorage 지속성)

- [ ] **Step 3: 테스트 실행**

```bash
npm test
```

기존 테스트 111개 모두 PASS 확인. (새 기능은 순수 함수 없이 UI 전용이므로 기존 테스트로 커버)

- [ ] **Step 4: 빌드 확인 후 push**

```bash
npm run build
git push
```

Cloudflare Pages 자동 배포 후 프로덕션에서도 동작 확인.
