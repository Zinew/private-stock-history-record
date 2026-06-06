import { useState } from 'react'
import EditModal from './EditModal.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import { fmtCurrency, pct } from '../utils/format.js'
import { useTranslation } from 'react-i18next'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},
}) {
  const [editingIndex, setEditingIndex] = useState(null)
  const { t } = useTranslation()

  const hasAutoHoldings = holdings.some(h =>
    (h.currency ?? 'USD') === 'USD' || (h.currency === 'KRW' && h.exchange)
  )
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  function formatUpdatedAt(date) {
    if (!date) return null
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="holdings">
      <div className="holdings-header">
        <h2 className="holdings-title">
          {t('holdings.title')}
        </h2>
        {hasAutoHoldings && (
          <>
            <button
              onClick={onRefresh}
              disabled={priceLoading}
              title={t('holdings.refresh')}
              className="refresh-btn"
            >
              ↻
            </button>
            {lastUpdatedAt && (
              <span className="refresh-time">
                {formatUpdatedAt(lastUpdatedAt)} {t('holdings.asOf')}
              </span>
            )}
          </>
        )}
      </div>

      {priceError && (
        <div className="price-error">
          ⚠ {priceError}
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('holdings.ticker')}</th><th>{t('holdings.qty')}</th><th>{t('holdings.avgCost')}</th><th>{t('holdings.currentPrice')}</th>
              <th>{t('holdings.value')} ({dispSym})</th><th>{t('holdings.pnl')} ({dispSym})</th><th>{t('holdings.returnRate')}</th><th>{t('holdings.weight')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr><td colSpan={9} className="empty">{t('holdings.empty')}</td></tr>
            ) : (
              holdings.map((h, i) => {
                const hCur = h.currency ?? 'USD'
                const val = toDisplay(h.q * h.c, hCur)
                const cost = toDisplay(h.q * h.b, hCur)
                const p = val - cost
                const r = cost > 0 ? p / cost * 100 : 0
                const w = totalVal > 0 ? val / totalVal * 100 : 0
                const isLive = prices[h.t] !== undefined
                return (
                  <tr key={i}>
                    <td>
                      <span className="tick">
                        {h.t}
                        {h.nm && <small>{h.nm}</small>}
                      </span>
                    </td>
                    <td>{h.q.toLocaleString()}</td>
                    <td>{fmtCurrency(h.b, hCur)}</td>
                    <td>
                      {isLive && <span className="live-dot">●</span>}
                      {fmtCurrency(h.c, hCur)}
                    </td>
                    <td>{fmtCurrency(val, displayCurrency)}</td>
                    <td className={p >= 0 ? 'pos' : 'neg'}>{fmtCurrency(p, displayCurrency)}</td>
                    <td className={r >= 0 ? 'pos' : 'neg'}>{pct(r)}</td>
                    <td>{w.toFixed(1)}%</td>
                    <td>
                      <button className="edit" onClick={() => setEditingIndex(i)} title={t('holdings.edit')}>✎</button>
                      <button className="del" onClick={() => onDelete(i)} title={t('holdings.delete')}>✕</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <AddHoldingForm onAdd={onAdd} />
      {editingIndex !== null && (
        <EditModal
          holding={rawHoldings[editingIndex]}
          onSave={patch => { onEdit(editingIndex, patch); setEditingIndex(null) }}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  )
}
