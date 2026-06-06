import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function ManualEventModal({ holdings, onSave, onClose }) {
  const [ticker, setTicker] = useState(holdings[0]?.t ?? '')
  const [date, setDate] = useState('')
  const [type, setType] = useState('earnings')
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const canSave = ticker && date

  function handleSave() {
    if (!canSave) return
    onSave({ ticker, date, type })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{t('manualEventModal.title')}</div>

        <div className="modal-field">
          <label>{t('manualEventModal.ticker')}</label>
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
          <label>{t('manualEventModal.date')}</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label>{t('manualEventModal.eventType')}</label>
          <div className="type-toggle">
            <button
              className={`type-btn${type === 'earnings' ? ' active earnings' : ''}`}
              onClick={() => setType('earnings')}
            >
              {t('manualEventModal.earnings')}
            </button>
            <button
              className={`type-btn${type === 'dividend' ? ' active dividend' : ''}`}
              onClick={() => setType('dividend')}
            >
              {t('manualEventModal.dividend')}
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={handleSave} disabled={!canSave}>
            {t('manualEventModal.save')}
          </button>
          <button className="btn ghost" onClick={onClose}>
            {t('manualEventModal.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
