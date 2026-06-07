import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

const BACKUP_KEYS = [
  'ledger_transactions',
  'ledger_snaps',
  'ledger_manual_events',
  'ledger_display_currency',
  'i18nextLng',
]

export default function BackupBar() {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)

  function handleExport() {
    const data = {}
    for (const key of BACKUP_KEYS) {
      const val = localStorage.getItem(key)
      if (val !== null) {
        try { data[key] = JSON.parse(val) } catch { data[key] = val }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result)
        if (!data.ledger_transactions) {
          alert(t('backup.importError'))
          return
        }
        if (!window.confirm(t('backup.importConfirm'))) return
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
        alert(t('backup.importSuccess'))
        window.location.reload()
      } catch {
        alert(t('backup.importError'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="card backup-bar">
      <button className="btn ghost" onClick={handleExport}>{t('backup.export')}</button>
      <button className="btn ghost" onClick={() => fileInputRef.current?.click()}>{t('backup.import')}</button>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
    </div>
  )
}
