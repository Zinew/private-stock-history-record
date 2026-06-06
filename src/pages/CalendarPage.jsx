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
    setManualEvents([...manualEvents, { ...ev, id: Date.now() }])
  }

  function deleteManualEvent(id) {
    setManualEvents(manualEvents.filter(e => e.id !== id))
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
          {sortedManual.map(ev => {
            const holding = holdings.find(h => h.t === ev.ticker)
            return (
              <div key={ev.id ?? ev.date + ev.ticker} className="calendar-card">
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
                  onClick={() => deleteManualEvent(ev.id)}
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
