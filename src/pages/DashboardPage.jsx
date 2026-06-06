import Charts from '../components/Charts.jsx'
import HoldingsTable from '../components/HoldingsTable.jsx'
import SnapshotBar from '../components/SnapshotBar.jsx'

export default function DashboardPage({ portfolio }) {
  return (
    <>
      <Charts
        holdings={portfolio.effectiveHoldings}
        snaps={portfolio.snaps}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
      />
      <HoldingsTable
        holdings={portfolio.effectiveHoldings}
        rawHoldings={portfolio.holdings}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
        prices={portfolio.prices}
        priceLoading={portfolio.priceLoading}
        priceError={portfolio.priceError}
        lastUpdatedAt={portfolio.lastUpdatedAt}
        onRefresh={portfolio.onRefresh}
        onAdd={portfolio.addHolding}
        onDelete={portfolio.delHolding}
        onEdit={portfolio.editHolding}
      />
      <SnapshotBar onSnapshot={portfolio.takeSnapshot} onClear={portfolio.clearSnaps} />
      <footer>
        데이터는 이 브라우저에만 저장됩니다 · 투자 판단의 근거가 아닌 기록·시각화 용도입니다<br />
        Ledger v2 — live prices via Finnhub (US) · Yahoo Finance (KRX)
      </footer>
    </>
  )
}
