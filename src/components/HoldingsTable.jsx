import { useState, useRef, useMemo } from 'react'
import EditModal from './EditModal.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import { fmtCurrency, pctArrow, fmtArrow } from '../utils/format.js'
import { useTranslation } from 'react-i18next'
import { computeRebalancing, totalTargetWeight } from '../utils/rebalancing.js'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},
  cash = 0, onSetCash = () => {}, targetWeights = {}, onSetTargetWeight = () => {},
}) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [cashEditing, setCashEditing] = useState(false)
  const { t } = useTranslation()
  const addbarRef = useRef(null)

  const hasAutoHoldings = holdings.some(h =>
    (h.currency ?? 'USD') === 'USD' || (h.currency === 'KRW' && h.exchange)
  )
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  const rebalancingRows = useMemo(() => {
    if (Object.keys(targetWeights).length === 0 || totalVal <= 0) return []
    const allRows = [
      ...holdings.map(h => ({
        t: h.t,
        nm: h.nm || h.t,
        displayVal: toDisplay(h.q * h.c, h.currency ?? 'USD'),
      })),
      { t: 'cash', nm: t('holdings.cash'), displayVal: Number(cash) || 0 },
    ]
    return computeRebalancing(allRows, targetWeights, totalVal)
  }, [holdings, cash, targetWeights, totalVal, toDisplay, t])

  function getOtherWeightsTotal(ticker) {
    return Object.entries(targetWeights)
      .filter(([k]) => k !== ticker)
      .reduce((s, [, v]) => s + (Number(v) || 0), 0)
  }

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
          <button className="btn-retry" onClick={onRefresh}>↺ {t('common.retry')}</button>
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('holdings.ticker')}</th><th>{t('holdings.qty')}</th><th>{t('holdings.avgCost')}</th><th>{t('holdings.currentPrice')}</th>
              <th>{t('holdings.value')} ({dispSym})</th><th>{t('holdings.pnl')} ({dispSym})</th><th>{t('holdings.returnRate')}</th><th>{t('holdings.weight')}</th><th>{t('holdings.targetWeight')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty-state">
                    <span className="empty-state-icon">📈</span>
                    <h3 className="empty-state-title">{t('holdings.emptyTitle')}</h3>
                    <p className="empty-state-desc">{t('holdings.emptyDesc')}</p>
                    <button
                      className="btn empty-state-cta"
                      onClick={() => addbarRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      {t('holdings.addFirst')}
                    </button>
                  </div>
                </td>
              </tr>
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
                    <td className={p >= 0 ? 'pos' : 'neg'}>{fmtArrow(p, displayCurrency)}</td>
                    <td className={r >= 0 ? 'pos' : 'neg'}>{pctArrow(r)}</td>
                    <td>{w.toFixed(1)}%</td>
                    <td>{targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}</td>
                    <td>
                      <button className="edit" onClick={() => setEditingIndex(i)} title={t('holdings.edit')}>✎</button>
                      <button className="del" onClick={() => onDelete(i)} title={t('holdings.delete')}>✕</button>
                    </td>
                  </tr>
                )
              })
            )}
            <tr className="cash-row">
              <td><span className="tick">CASH<small>{t('holdings.cash')}</small></span></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>{fmtCurrency(Number(cash) || 0, displayCurrency)}</td>
              <td>—</td>
              <td>—</td>
              <td>{totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%</td>
              <td>{targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}</td>
              <td>
                <button className="edit" onClick={() => setCashEditing(true)} title={t('holdings.edit')}>✎</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {rebalancingRows.length > 0 && (
        <div className="rebalancing-card">
          <h3 className="rebalancing-title">{t('holdings.rebalancingGuide')}</h3>
          <table className="rebalancing-table">
            <thead>
              <tr>
                <th>{t('holdings.ticker')}</th>
                <th>{t('holdings.weight')}</th>
                <th>{t('holdings.targetWeight')}</th>
                <th>±%</th>
                <th>{t('holdings.value')} ({dispSym})</th>
              </tr>
            </thead>
            <tbody>
              {rebalancingRows.map(row => (
                <tr key={row.ticker}>
                  <td>{row.nm || row.ticker}</td>
                  <td>{row.currentPct.toFixed(1)}%</td>
                  <td>{row.targetPct.toFixed(1)}%</td>
                  <td className={row.diffPct >= 0 ? 'pos' : 'neg'}>
                    {row.diffPct >= 0 ? '+' : ''}{row.diffPct.toFixed(1)}%
                  </td>
                  <td>
                    <span className={`rebal-action rebal-action--${row.action}`}>
                      {t(`holdings.${row.action}`)}
                    </span>
                    {row.action !== 'hold' && ` ${fmtCurrency(row.amount, displayCurrency)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(() => {
            const total = totalTargetWeight(targetWeights)
            if (Math.abs(total - 100) < 0.01) return null
            return (
              <p className="rebalancing-hint">
                {t('holdings.targetTotal')}: {total.toFixed(1)}%
                {total < 100 && ` — ${(100 - total).toFixed(1)}% ${t('holdings.unassigned')}`}
              </p>
            )
          })()}
        </div>
      )}

      <div className="holdings-mobile-list">
        {holdings.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📈</span>
            <h3 className="empty-state-title">{t('holdings.emptyTitle')}</h3>
            <p className="empty-state-desc">{t('holdings.emptyDesc')}</p>
            <button
              className="btn empty-state-cta"
              onClick={() => addbarRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('holdings.addFirst')}
            </button>
          </div>
        ) : holdings.map((h, i) => {
          const hCur = h.currency ?? 'USD'
          const val = toDisplay(h.q * h.c, hCur)
          const cost = toDisplay(h.q * h.b, hCur)
          const p = val - cost
          const r = cost > 0 ? p / cost * 100 : 0
          const w = totalVal > 0 ? val / totalVal * 100 : 0
          const market = h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : 'US'
          return (
            <div className="holding-card" key={i}>
              <div className="holding-card-header">
                <div>
                  <div className="holding-card-name">
                    {h.nm || h.t}
                    <span className="market-badge">{market}</span>
                  </div>
                  <div className="holding-card-sub">{h.t} · {h.q.toLocaleString()} {t('holdings.qty')}</div>
                </div>
                <div>
                  <div className="holding-card-val">{fmtCurrency(val, displayCurrency)}</div>
                  <div className={`holding-card-rate ${r >= 0 ? 'pos' : 'neg'}`}>{pctArrow(r)}</div>
                </div>
              </div>
              <div className="holding-card-stats">
                <div>
                  <div className="holding-card-stat-label">{t('holdings.currentPrice')}</div>
                  <div className="holding-card-stat-val">{fmtCurrency(h.c, hCur)}</div>
                </div>
                <div>
                  <div className="holding-card-stat-label">{t('holdings.avgCost')}</div>
                  <div className="holding-card-stat-val">{fmtCurrency(h.b, hCur)}</div>
                </div>
                <div>
                  <div className="holding-card-stat-label">{t('holdings.weight')}</div>
                  <div className="holding-card-stat-val">{w.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
                  <div className="holding-card-stat-val">
                    {targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}
                  </div>
                </div>
              </div>
              <div className="holding-card-actions">
                <button className="edit" onClick={() => setEditingIndex(i)} title={t('holdings.edit')}>✎</button>
              </div>
            </div>
          )
        })}
        <div className="holding-card cash-card">
          <div className="holding-card-header">
            <div>
              <div className="holding-card-name">{t('holdings.cash')}</div>
              <div className="holding-card-sub">CASH</div>
            </div>
            <div>
              <div className="holding-card-val">{fmtCurrency(Number(cash) || 0, displayCurrency)}</div>
            </div>
          </div>
          <div className="holding-card-stats">
            <div>
              <div className="holding-card-stat-label">{t('holdings.weight')}</div>
              <div className="holding-card-stat-val">
                {totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
            <div>
              <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
              <div className="holding-card-stat-val">
                {targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}
              </div>
            </div>
          </div>
          <div className="holding-card-actions">
            <button className="edit" onClick={() => setCashEditing(true)} title={t('holdings.edit')}>✎</button>
          </div>
        </div>
      </div>

      <div ref={addbarRef}>
        <AddHoldingForm onAddTransaction={onAdd} holdings={rawHoldings} />
      </div>
      {editingIndex !== null && (
        <EditModal
          holding={rawHoldings[editingIndex]}
          targetWeight={targetWeights[rawHoldings[editingIndex]?.t] != null ? targetWeights[rawHoldings[editingIndex]?.t] : ''}
          otherWeightsTotal={getOtherWeightsTotal(rawHoldings[editingIndex]?.t)}
          onSave={patch => {
            onEdit(editingIndex, { nm: patch.nm })
            onSetTargetWeight(rawHoldings[editingIndex].t, patch.tw)
            setEditingIndex(null)
          }}
          onClose={() => setEditingIndex(null)}
        />
      )}
      {cashEditing && (
        <EditModal
          holding={{ t: 'CASH', nm: t('holdings.cash') }}
          cashMode
          cashAmount={Number(cash) || 0}
          targetWeight={targetWeights['cash'] != null ? targetWeights['cash'] : ''}
          otherWeightsTotal={getOtherWeightsTotal('cash')}
          onSave={patch => {
            onSetCash(patch.cashAmount)
            onSetTargetWeight('cash', patch.tw)
            setCashEditing(false)
          }}
          onClose={() => setCashEditing(false)}
        />
      )}
    </div>
  )
}
