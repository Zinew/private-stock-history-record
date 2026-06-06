import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function EditModal({ holding, onSave, onClose }) {
  const [form, setForm] = useState({
    nm: holding.nm ?? '',
    q:  String(holding.q),
    b:  String(holding.b),
    c:  String(holding.c),
  })
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSave() {
    const q = parseFloat(form.q)
    const b = parseFloat(form.b)
    const c = parseFloat(form.c)
    if (!(q > 0) || !(b >= 0) || !(c >= 0)) {
      alert(t('editModal.validationError'))
      return
    }
    onSave({ nm: form.nm.trim(), q, b, c })
  }

  const isKRW = (holding.currency ?? 'USD') === 'KRW'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">
          {holding.t} {t('editModal.title')}
        </h3>
        <div className="modal-field">
          <label>{t('editModal.name')}</label>
          <input value={form.nm} onChange={e => setForm(f => ({ ...f, nm: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>{t('editModal.qty')}</label>
          <input type="number" step="any" value={form.q} onChange={e => setForm(f => ({ ...f, q: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>{t('editModal.avgCost')}</label>
          <input type="number" step="any" value={form.b} onChange={e => setForm(f => ({ ...f, b: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>
            {t('editModal.currentPrice')}
            {!isKRW && <span className="auto-label">{t('editModal.apiAuto')}</span>}
          </label>
          <input
            type="number" step="any"
            value={form.c}
            readOnly={!isKRW}
            style={!isKRW ? { opacity: 0.4 } : {}}
            onChange={e => { if (isKRW) setForm(f => ({ ...f, c: e.target.value })) }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>{t('editModal.save')}</button>
          <button className="btn ghost" onClick={onClose}>{t('editModal.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
