import Charts from '../components/Charts.jsx'
import HoldingsTable from '../components/HoldingsTable.jsx'
import RebalancingGuide from '../components/RebalancingGuide.jsx'
import TransactionHistory from '../components/TransactionHistory.jsx'
import BackupBar from '../components/BackupBar.jsx'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta.js'
import { PAGE_META } from '../config/site.js'
import OnboardingWizard from '../components/home/OnboardingWizard.jsx'
import HomeGuide from '../components/home/HomeGuide.jsx'

export default function DashboardPage({ portfolio }) {
  const { t } = useTranslation()
  usePageMeta({ ...PAGE_META['/'], path: '/' })
  const isEmpty = portfolio.holdings.length === 0
  return (
    <>
      {isEmpty && <OnboardingWizard />}
      <Charts
        holdings={portfolio.effectiveHoldings}
        snaps={portfolio.snaps}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
        onDeleteSnap={portfolio.deleteSnap}
        onRestoreSnap={portfolio.restoreSnap}
        cash={portfolio.cash}
      />
      <RebalancingGuide
        holdings={portfolio.effectiveHoldings}
        cash={portfolio.cash}
        targetWeights={portfolio.targetWeights}
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
        onAdd={portfolio.addTransaction}
        onDelete={portfolio.delHolding}
        onEdit={portfolio.editHolding}
        cash={portfolio.cash}
        cashRaw={portfolio.cashRaw}
        onSetCash={portfolio.setCash}
        targetWeights={portfolio.targetWeights}
        onSetTargetWeight={portfolio.setTargetWeight}
      />
      <TransactionHistory
        transactions={portfolio.transactions}
        onDelete={portfolio.deleteTransaction}
        onEdit={portfolio.editTransaction}
      />
      <BackupBar />
      {isEmpty && <HomeGuide />}
      <footer>
        {t('dashboard.disclaimer')}<br />
        Ledger v2 — live prices via Finnhub (US) · Yahoo Finance (KRX)
      </footer>
    </>
  )
}
