import { useState, useRef } from 'react'
import EditModal from './EditModal.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import { fmtCurrency, pctArrow, fmtArrow } from '../utils/format.js'
import { useTranslation } from 'react-i18next'
import HoldingsDesktopTable from './HoldingsDesktopTable.jsx'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},
  cash = 0, onSetCash = () => {}, targetWeights = {}, onSetTargetWeight = () => {},
}) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [cashEditing, setCashEditing] = useState(false)
  const [expandedCards, setExpandedCards] = useState({})
  const toggleCard = (ticker) =>
    setExpandedCards(prev => ({ ...prev, [ticker]: !prev[ticker] }))
  const { t } = useTranslation()
  const addbarRef = useRef(null)
  const onAddFirst = () => addbarRef.current?.scrollIntoView({ behavior: 'smooth' })

  const hasAutoHoldings = holdings.some(h =>
    (h.currency ?? 'USD') === 'USD' || (h.currency === 'KRW' && h.exchange)
  )
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

      <HoldingsDesktopTable
        holdings={holdings}
        totalVal={totalVal}
        displayCurrency={displayCurrency}
        toDisplay={toDisplay}
        prices={prices}
        targetWeights={targetWeights}
        cash={cash}
        onEditRow={setEditingIndex}
        onDelete={onDelete}
        onCashEdit={() => setCashEditing(true)}
        onAddFirst={onAddFirst}
      />

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
                <div className="holding-card-name-row">
                  <div className="holding-card-name">
                    <span className="card-name-text">{h.nm || h.t}</span>
                    <span className="market-badge">{market}</span>
                  </div>
                  <button
                    className="mobile-card-toggle"
                    onClick={() => toggleCard(h.t)}
                    title={expandedCards[h.t] ? t('common.collapse') : t('common.expand')}
                  >
                    {expandedCards[h.t] ? '∧' : '∨'}
                  </button>
                </div>
                <div className="holding-card-val-row">
                  <div className="holding-card-val">{fmtCurrency(val, displayCurrency)}</div>
                  <div className={`holding-card-rate ${r >= 0 ? 'pos' : 'neg'}`}>{pctArrow(r)}</div>
                </div>
              </div>
              {expandedCards[h.t] && (
                <>
                  <div className="holding-card-sub">{h.t} · {h.q.toLocaleString()} {t('holdings.qty')}</div>
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
                </>
              )}
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
