import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { useExchangeRate } from './useExchangeRate.js'
import { useStockPrices } from './useStockPrices.js'
import { useKrxPrices } from './useKrxPrices.js'

export function usePortfolio() {
  const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const usdTickers = useMemo(
    () => holdings.filter(h => h.currency === 'USD').map(h => h.t),
    [holdings]
  )
  const { prices: usdPrices, loading: usdLoading, error: usdError, lastUpdatedAt, refresh: refreshUsd } = useStockPrices(usdTickers)

  const krwHoldings = useMemo(
    () => holdings.filter(h => h.currency === 'KRW' && h.exchange).map(h => ({ t: h.t, exchange: h.exchange })),
    [holdings]
  )
  const { prices: krwPrices, loading: krwLoading, error: krwError, refresh: refreshKrw } = useKrxPrices(krwHoldings)

  const prices = useMemo(() => ({ ...usdPrices, ...krwPrices }), [usdPrices, krwPrices])
  const priceLoading = usdLoading || krwLoading
  const priceError = usdError || krwError || null

  const displayCurrency = exchangeRate.rate ? displayCurrencyRaw : 'USD'

  const effectiveHoldings = holdings.map(h => ({
    ...h,
    c: prices[h.t] !== undefined ? prices[h.t] : h.c,
  }))

  function toDisplay(amount, fromCurrency) {
    if (!exchangeRate.rate || fromCurrency === displayCurrency) return amount
    return displayCurrency === 'KRW'
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
    const next = [...snaps, { label, total: totalVal, currency: displayCurrency }]
    setSnaps(next.length > 60 ? next.slice(-60) : next)
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  return {
    holdings,
    effectiveHoldings,
    snaps,
    displayCurrency,
    exchangeRate,
    totalVal,
    totalCost,
    pl,
    ret,
    toDisplay,
    prices,
    priceLoading,
    priceError,
    lastUpdatedAt,
    onRefresh: () => { refreshUsd(); refreshKrw() },
    addHolding,
    delHolding,
    editHolding,
    toggleCurrency,
    takeSnapshot,
    clearSnaps,
  }
}
