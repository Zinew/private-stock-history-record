import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function EditModal({
  holding,
  onSave,
  onClose,
  cashMode = false,
  cashAmount = 0,
  cashCurrency = 'USD',
  targetWeight = '',
  otherWeightsTotal = 0,
}) {
  const [nm, setNm] = useState(holding.nm ?? '')
  const [tw, setTw] = useState(targetWeight !== '' && targetWeight != null ? String(targetWeight) : '')
  const [cashAmt, setCashAmt] = useState(String(cashAmount))
  const [cashCur, setCashCur] = useState(cashCurrency)
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const twNum = tw === '' ? 0 : Number(tw)
  const total = otherWeightsTotal + twNum
  const remaining = 100 - total
  const exceeds = total > 100

  function handleSave() {
    const patch = {}
    if (cashMode) {
      patch.cashAmount = Number(cashAmt) || 0
      patch.cashCurrency = cashCur
    }
    else patch.nm = nm.trim()
    patch.tw = tw === '' ? null : Math.max(0, Number(tw))
    onSave(patch)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{holding.t} {t('editModal.title')}</h3>
        {cashMode ? (
          <div className="modal-field">
            <label>{t('editModal.cashBalance')}</label>
            <input
              type="number"
              min="0"
              value={cashAmt}
              onChange={e => setCashAmt(e.target.value)}
            />
            <div className="currency-toggle" style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <button
                type="button"
                className={`currency-btn ${cashCur === 'KRW' ? 'active' : ''}`}
                onClick={() => setCashCur('KRW')}
              >KRW</button>
              <button
                type="button"
                className={`currency-btn ${cashCur === 'USD' ? 'active' : ''}`}
                onClick={() => setCashCur('USD')}
              >USD</button>
            </div>
          </div>
        ) : (
          <div className="modal-field">
            <label>{t('editModal.name')}</label>
            <input value={nm} onChange={e => setNm(e.target.value)} />
          </div>
        )}
        <div className="modal-field">
          <label>{t('editModal.targetWeight')}</label>
          <div className="modal-field-row">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tw}
              onChange={e => setTw(e.target.value)}
              placeholder="0"
            />
            <span className={`weight-hint${exceeds ? ' weight-exceeds' : ''}`}>
              {exceeds
                ? t('editModal.weightExceeds100', { total: total.toFixed(1) })
                : t('editModal.weightRemaining', { remaining: remaining.toFixed(1) })
              }
            </span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>{t('editModal.save')}</button>
          <button className="btn ghost" onClick={onClose}>{t('editModal.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
