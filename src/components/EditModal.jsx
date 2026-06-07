import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function EditModal({ holding, onSave, onClose }) {
  const [nm, setNm] = useState(holding.nm ?? '')
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSave() {
    onSave({ nm: nm.trim() })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{holding.t} {t('editModal.title')}</h3>
        <div className="modal-field">
          <label>{t('editModal.name')}</label>
          <input value={nm} onChange={e => setNm(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>{t('editModal.save')}</button>
          <button className="btn ghost" onClick={onClose}>{t('editModal.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
