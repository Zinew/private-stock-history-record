import { useState, useEffect } from 'react'

export default function ManualEventModal({ holdings, onSave, onClose }) {
  const [ticker, setTicker] = useState(holdings[0]?.t ?? '')
  const [date, setDate] = useState('')
  const [type, setType] = useState('earnings')

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
