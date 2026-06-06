import { useState } from 'react'
import EditModal from './EditModal.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import { fmtCurrency, pct } from '../utils/format.js'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},
}) {
  const [editingIndex, setEditingIndex] = useState(null)

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-dim)', margin: 0 }}>
          보유 종목
        </h2>
        {hasAutoHoldings && (
          <>
            <button
              onClick={onRefresh}
              disabled={priceLoading}
              title="주가 새로고침"
              style={{ background: 'none', border: '1px solid var(--ink-dim)', borderRadius: 4, color: 'var(--ink-dim)', cursor: priceLoading ? 'default' : 'pointer', fontSize: 12, padding: '2px 8px', opacity: priceLoading ? 0.5 : 1 }}
            >
              ↻
            </button>
            {lastUpdatedAt && (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: 'var(--ink-faint)' }}>
                {formatUpdatedAt(lastUpdatedAt)} 기준
              </span>
            )}
          </>
        )}
      </div>

      {priceError && (
        <div style={{ background: 'rgba(232,101,79,.12)', border: '1px solid rgba(232,101,79,.3)', borderRadius: 6, color: '#e8654f', fontSize: 12, marginBottom: 12, padding: '6px 12px' }}>
          ⚠ {priceError}
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>종목</th><th>수량</th><th>매수가</th><th>현재가</th>
              <th>평가액 ({dispSym})</th><th>손익 ({dispSym})</th><th>수익률</th><th>비중</th><th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr><td colSpan={9} className="empty">아직 종목이 없습니다. 아래에서 첫 종목을 추가해 보세요.</td></tr>
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
                      {isLive && <span style={{ color: '#3fbf8f', fontSize: 9, marginRight: 3 }}>●</span>}
                      {fmtCurrency(h.c, hCur)}
                    </td>
                    <td>{fmtCurrency(val, displayCurrency)}</td>
                    <td className={p >= 0 ? 'pos' : 'neg'}>{fmtCurrency(p, displayCurrency)}</td>
                    <td className={r >= 0 ? 'pos' : 'neg'}>{pct(r)}</td>
                    <td>{w.toFixed(1)}%</td>
                    <td>
                      <button className="edit" onClick={() => setEditingIndex(i)} title="수정">✎</button>
                      <button className="del" onClick={() => onDelete(i)} title="삭제">✕</button>
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
