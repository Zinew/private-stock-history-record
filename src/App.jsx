import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useExchangeRate } from './hooks/useExchangeRate.js'
import { useStockPrices } from './hooks/useStockPrices.js'
import Header from './components/Header.jsx'
import Charts from './components/Charts.jsx'
import HoldingsTable from './components/HoldingsTable.jsx'
import SnapshotBar from './components/SnapshotBar.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export default function App() {
  const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrency, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const usdTickers = useMemo(
    () => holdings.filter(h => h.currency === 'USD').map(h => h.t),
    [holdings]
  )
  const { prices, loading: priceLoading, error: priceError, lastUpdatedAt, refresh } = useStockPrices(usdTickers)

  const effectiveHoldings = holdings.map(h => ({
    ...h,
    c: h.currency === 'USD' ? (prices[h.t] ?? h.c) : h.c,
  }))

  const effectiveDisplayCurrency = exchangeRate.rate ? displayCurrency : 'USD'

  function toDisplay(amount, fromCurrency) {
    if (!exchangeRate.rate || fromCurrency === effectiveDisplayCurrency) return amount
    return effectiveDisplayCurrency === 'KRW'
      ? amount * exchangeRate.rate
      : amount / exchangeRate.rate
  }

  const totalVal = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
  const totalCost = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
  const pl = totalVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0

  function addHolding({ t, nm, q, b, c, currency }) {
    setHoldings([...holdings, { t, nm, q, b, c, currency }])
  }

  function delHolding(i) {
    setHoldings(holdings.filter((_, idx) => idx !== i))
  }

  function editHolding(i, patch) {
    setHoldings(holdings.map((h, idx) => idx === i ? { ...h, ...patch } : h))
  }

  function toggleCurrency() {
    if (!exchangeRate.rate) return
    setDisplayCurrency(prev => prev === 'USD' ? 'KRW' : 'USD')
  }

  function takeSnapshot() {
    if (holdings.length === 0) { alert('먼저 종목을 추가해 주세요.'); return }
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const next = [...snaps, { label, total: totalVal, currency: effectiveDisplayCurrency }]
    setSnaps(next.length > 60 ? next.slice(-60) : next)
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  return (
    <div className="wrap">
      <Header
        totalVal={totalVal}
        totalCost={totalCost}
        pl={pl}
        ret={ret}
        displayCurrency={effectiveDisplayCurrency}
        onToggleCurrency={toggleCurrency}
        exchangeRate={exchangeRate}
      />
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
        onAdd={addHolding}
        onDelete={delHolding}
        onEdit={editHolding}
        rawHoldings={holdings}
        displayCurrency={effectiveDisplayCurrency}
        toDisplay={toDisplay}
        prices={prices}
        priceLoading={priceLoading}
        priceError={priceError}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={refresh}
      />
      <SnapshotBar onSnapshot={takeSnapshot} onClear={clearSnaps} />
      <footer>
        데이터는 이 브라우저에만 저장됩니다 · 투자 판단의 근거가 아닌 기록·시각화 용도입니다<br />
        Ledger v2 — live US prices via Finnhub
      </footer>
    </div>
  )
}
