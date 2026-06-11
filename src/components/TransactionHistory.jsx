import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtCurrency } from '../utils/format.js'
import TransactionEditModal from './TransactionEditModal.jsx'

export default function TransactionHistory({ transactions, onDelete, onEdit }) {
  const { t } = useTranslation()
  const [editingTx, setEditingTx] = useState(null)

  const sorted = [...transactions].sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })

  return (
    <div className="holdings tx-section">
      <h2 className="holdings-title">{t('tx.history')}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('tx.date')}</th>
              <th>{t('holdings.ticker')}</th>
              <th>{t('tx.type')}</th>
              <th>{t('tx.qty')}</th>
              <th>{t('tx.price')}</th>
              <th>{t('tx.amount')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={7} className="empty">{t('tx.empty')}</td></tr>
            ) : (
              sorted.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.date ?? <span className="tx-unknown-date">{t('tx.unknownDate')}</span>}</td>
                  <td>
                    <span className="tick">
                      {tx.ticker}
                      {tx.name && tx.name !== tx.ticker && <small>{tx.name}</small>}
                    </span>
                  </td>
                  <td>
                    <span className={`tx-type-badge ${tx.type}`}>
                      {t(`tx.${tx.type}`)}
                    </span>
                  </td>
                  <td>{tx.qty.toLocaleString()}</td>
                  <td>{fmtCurrency(tx.price, tx.currency)}</td>
                  <td>{fmtCurrency(tx.qty * tx.price, tx.currency)}</td>
                  <td>
                    <button className="edit" onClick={() => setEditingTx(tx)} title={t('tx.edit')}>✎</button>
                    <button className="del" onClick={() => onDelete(tx.id)} title={t('holdings.delete')}>✕</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="tx-mobile-list">
        {sorted.length === 0 ? (
          <p className="empty">{t('tx.empty')}</p>
        ) : sorted.map(tx => (
          <div className="tx-card" key={tx.id}>
            <span className={`tx-card-badge ${tx.type}`}>{t(`tx.${tx.type}`)}</span>
            <div className="tx-card-info">
              <div>
                <span className="tx-card-ticker">{tx.ticker}</span>
                {tx.name && tx.name !== tx.ticker && <span className="tx-card-name">{tx.name}</span>}
              </div>
              <div className="tx-card-detail">
                <div>{tx.date ?? t('tx.unknownDate')}</div>
                <div>{tx.qty.toLocaleString()}{t('tx.sharesUnit')} / {fmtCurrency(tx.price, tx.currency)}</div>
              </div>
            </div>
            <div className="tx-card-right">
              <div className="tx-card-amount">{fmtCurrency(tx.qty * tx.price, tx.currency)}</div>
              <button className="edit" onClick={() => setEditingTx(tx)} title={t('tx.edit')}>✎</button>
            </div>
          </div>
        ))}
      </div>

      {editingTx && (
        <TransactionEditModal
          transaction={editingTx}
          onSave={patch => { onEdit(editingTx.id, patch); setEditingTx(null) }}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  )
}
