import { useState } from 'react'
import { useCalendarEvents } from '../hooks/useCalendarEvents.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import ManualEventModal from '../components/ManualEventModal.jsx'
import { useTranslation } from 'react-i18next'

export default function CalendarPage({ portfolio }) {
  const holdings = portfolio?.holdings ?? []
  const { events, loading, error } = useCalendarEvents(holdings)
  const [manualEvents, setManualEvents] = useLocalStorage('ledger_manual_events', [])
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation()

  const grouped = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  const sortedManual = [...manualEvents].sort((a, b) => a.date.localeCompare(b.date))

  function addManualEvent(ev) {
    setManualEvents([...manualEvents, { ...ev, id: crypto.randomUUID() }])
  }

  function deleteManualEvent(id) {
    if (id == null) return
    setManualEvents(manualEvents.filter(e => e.id !== id))
  }

  return (
    <div className="holdings">
      <h2 className="calendar-heading">{t('calendar.title')}</h2>

      <div className="calendar-section-header">
        <span className="calendar-section-label">{t('calendar.autoEvents')}</span>
      </div>

      {loading && <p className="calendar-empty">{t('calendar.loading')}</p>}
      {error && <div className="price-error">⚠ {error}</div>}

      {!loading && !error && events.length === 0 && (
        <p className="calendar-empty">{t('calendar.noAutoEvents')}</p>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="calendar-list">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="calendar-date-header">{date}</div>
              {dayEvents.map((ev, i) => (
                <div key={i} className="calendar-card">
                  <span className={`calendar-badge ${ev.type}`}>
                    {ev.type === 'earnings' ? t('calendar.earnings') : t('calendar.dividend')}
                  </span>
                  <div className="calendar-card-info">
                    <div>
                      <span className="calendar-card-ticker">{ev.ticker}</span>
                      {ev.name !== ev.ticker && (
                        <span className="calendar-card-name">{ev.name}</span>
                      )}
                    </div>
                    {ev.type === 'earnings' && ev.epsEstimate !== null && (
                      <div className="calendar-card-detail">{t('calendar.epsEstimate')}${ev.epsEstimate}</div>
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

      <div className="calendar-section-header">
        <span className="calendar-section-label">{t('calendar.manualEvents')}</span>
        {holdings.length > 0 && (
          <button className="calendar-add-btn" onClick={() => setShowModal(true)}>
            {t('calendar.addButton')}
          </button>
        )}
      </div>

      {sortedManual.length === 0 && (
        <p className="calendar-empty">{t('calendar.noManualEvents')}</p>
      )}

      {sortedManual.length > 0 && (
        <div className="calendar-list">
          {sortedManual.map(ev => {
            const holding = holdings.find(h => h.t === ev.ticker)
            return (
              <div key={ev.id ?? ev.date + ev.ticker} className="calendar-card">
                <span className={`calendar-badge ${ev.type}`}>
                  {ev.type === 'earnings' ? t('calendar.earnings') : t('calendar.dividend')}
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
                  title={t('calendar.delete')}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ManualEventModal
          holdings={holdings}
          onSave={addManualEvent}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
