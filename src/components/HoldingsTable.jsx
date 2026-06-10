import { useState, useRef } from 'react'
import EditModal from './EditModal.jsx'
import AddHoldingForm from './AddHoldingForm.jsx'
import { useTranslation } from 'react-i18next'
import HoldingsDesktopTable from './HoldingsDesktopTable.jsx'
import HoldingsMobileList from './HoldingsMobileList.jsx'

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

      <HoldingsMobileList
        holdings={holdings}
        totalVal={totalVal}
        displayCurrency={displayCurrency}
        toDisplay={toDisplay}
        targetWeights={targetWeights}
        cash={cash}
        onEditRow={setEditingIndex}
        onCashEdit={() => setCashEditing(true)}
        onAddFirst={onAddFirst}
      />

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
