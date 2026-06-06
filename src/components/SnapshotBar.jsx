import { useTranslation } from 'react-i18next'

export default function SnapshotBar({ onSnapshot, onClear }) {
  const { t } = useTranslation()
  return (
    <div className="card snapbar" style={{ marginBottom: 20 }}>
      <button className="btn ghost" onClick={onSnapshot}>{t('snapshot.record')}</button>
      <button className="btn ghost" onClick={onClear}>{t('snapshot.reset')}</button>
      <span className="note">
        {t('snapshot.desc1')} {t('snapshot.desc2')}
      </span>
    </div>
  )
}
