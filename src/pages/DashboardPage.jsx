import Charts from '../components/Charts.jsx'
import HoldingsTable from '../components/HoldingsTable.jsx'
import SnapshotBar from '../components/SnapshotBar.jsx'

export default function DashboardPage({
  effectiveHoldings,
  snaps,
  totalVal,
  effectiveDisplayCurrency,
  toDisplay,
  prices,
  priceLoading,
  priceError,
  lastUpdatedAt,
  onRefresh,
  onAdd,
  onDelete,
  onEdit,
  rawHoldings,
  onSnapshot,
  onClear,
}) {
  return (
    <>
      <Charts
        holdings={effectiveHoldings}
        snaps={snaps}
        totalVal={totalVal}
        displayCurrency={effectiveDisplayCurrency}
        toDisplay={toDisplay}
      />
      <HoldingsTable
        holdings={effectiveHoldings}
        totalVal={totalVal}
        onAdd={onAdd}
        onDelete={onDelete}
        onEdit={onEdit}
        rawHoldings={rawHoldings}
        displayCurrency={effectiveDisplayCurrency}
        toDisplay={toDisplay}
        prices={prices}
        priceLoading={priceLoading}
        priceError={priceError}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={onRefresh}
      />
      <SnapshotBar onSnapshot={onSnapshot} onClear={onClear} />
      <footer>
        데이터는 이 브라우저에만 저장됩니다 · 투자 판단의 근거가 아닌 기록·시각화 용도입니다<br />
        Ledger v2 — live prices via Finnhub (US) · Yahoo Finance (KRX)
      </footer>
    </>
  )
}
