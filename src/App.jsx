import { useState, useMemo } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useExchangeRate } from './hooks/useExchangeRate.js'
import { useStockPrices } from './hooks/useStockPrices.js'
import { useKrxPrices } from './hooks/useKrxPrices.js'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import NewsPage from './pages/NewsPage.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export default function App() {
  const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrency, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useExchangeRate(setExchangeRate)

  const usdTickers = useMemo(
    () => holdings.filter(h => h.currency === 'USD').map(h => h.t),
    [holdings]
  )
  const { prices: usdPrices, loading: usdLoading, error: usdError, lastUpdatedAt: usdUpdatedAt, refresh: refreshUsd } = useStockPrices(usdTickers)

  const krwHoldings = useMemo(
    () => holdings.filter(h => h.currency === 'KRW' && h.exchange).map(h => ({ t: h.t, exchange: h.exchange })),
    [holdings]
  )
  const { prices: krwPrices, loading: krwLoading, error: krwError, refresh: refreshKrw } = useKrxPrices(krwHoldings)

  const prices = useMemo(() => ({ ...usdPrices, ...krwPrices }), [usdPrices, krwPrices])
  const priceLoading = usdLoading || krwLoading
  const priceError = usdError || krwError || null
  const lastUpdatedAt = usdUpdatedAt

  const effectiveHoldings = holdings.map(h => ({
    ...h,
    c: prices[h.t] !== undefined ? prices[h.t] : h.c,
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

  function addHolding({ t, nm, q, b, c, currency, exchange }) {
    const holding = { t, nm, q, b, c, currency }
    if (exchange) holding.exchange = exchange
    setHoldings([...holdings, holding])
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header
        totalVal={totalVal}
        totalCost={totalCost}
        pl={pl}
        ret={ret}
        displayCurrency={effectiveDisplayCurrency}
        onToggleCurrency={toggleCurrency}
        exchangeRate={exchangeRate}
        onMenuOpen={() => setSidebarOpen(true)}
      />
      <Routes>
        <Route path="/" element={
          <DashboardPage
            effectiveHoldings={effectiveHoldings}
            snaps={snaps}
            totalVal={totalVal}
            effectiveDisplayCurrency={effectiveDisplayCurrency}
            toDisplay={toDisplay}
            prices={prices}
            priceLoading={priceLoading}
            priceError={priceError}
            lastUpdatedAt={lastUpdatedAt}
            onRefresh={() => { refreshUsd(); refreshKrw() }}
            onAdd={addHolding}
            onDelete={delHolding}
            onEdit={editHolding}
            rawHoldings={holdings}
            onSnapshot={takeSnapshot}
            onClear={clearSnaps}
          />
        } />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/news" element={<NewsPage />} />
      </Routes>
    </div>
  )
}
