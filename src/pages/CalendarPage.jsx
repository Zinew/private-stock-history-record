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
