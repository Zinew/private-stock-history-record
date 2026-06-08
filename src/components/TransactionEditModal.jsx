import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function TransactionEditModal({ transaction, onSave, onClose }) {
  const { t } = useTranslation()
  const [date, setDate] = useState(transaction.date ?? '')
  const [qty, setQty] = useState(String(transaction.qty))
  const [price, setPrice] = useState(String(transaction.price))
  const [error, setError] = useState('')

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSave() {
    const parsedQty = parseFloat(qty)
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedQty) || parsedQty <= 0 || isNaN(parsedPrice) || parsedPrice < 0) {
      setError(t('tx.validationError'))
      return
    }
    onSave({ date: date || null, qty: parsedQty, price: parsedPrice })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">
          {transaction.ticker} {t('tx.editTitle')}
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-faint)' }}>
            {t(`tx.${transaction.type}`)}
          </span>
        </h3>

        <div className="modal-field">
          <label>{t('tx.date')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="modal-field">
          <label>{t('tx.qty')}</label>
          <input
            type="number"
            min="0"
            step="any"
            value={qty}
            onChange={e => setQty(e.target.value)}
          />
        </div>
        <div className="modal-field">
          <label>{t('tx.price')}</label>
          <input
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>

        {error && <p style={{ color: '#e8654f', fontSize: 12, margin: '0 0 12px' }}>{error}</p>}

        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>{t('editModal.save')}</button>
          <button className="btn ghost" onClick={onClose}>{t('editModal.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
