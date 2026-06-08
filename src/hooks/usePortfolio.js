import { useMemo, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { useExchangeRate } from './useExchangeRate.js'
import { useStockPrices } from './useStockPrices.js'
import { useKrxPrices } from './useKrxPrices.js'
import { migrateHoldingsToTransactions, deriveHoldings, deriveRealizedGains } from '../utils/transactions.js'

function runMigrationIfNeeded() {
  if (localStorage.getItem('ledger_migration_v1')) return
  localStorage.setItem('ledger_migration_v1', '1')
  const rawHoldings = localStorage.getItem('ledger_holdings')
  if (!rawHoldings) return
  try {
    const holdings = JSON.parse(rawHoldings)
    if (!holdings.length) return
    const migrated = migrateHoldingsToTransactions(holdings)
    localStorage.setItem('ledger_transactions', JSON.stringify(migrated))
    localStorage.removeItem('ledger_holdings')
  } catch {
    localStorage.removeItem('ledger_holdings')
  }
}

runMigrationIfNeeded()

export function usePortfolio() {
  const [transactions, setTransactions] = useLocalStorage('ledger_transactions', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const holdings = useMemo(() => deriveHoldings(transactions), [transactions])
  const realizedGains = useMemo(() => deriveRealizedGains(transactions), [transactions])

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
  const prevPriceLoading = useRef(false)
  const snapAfterTx = useRef(false)
  const priceError = usdError || krwError || null

  const displayCurrency = exchangeRate.rate ? displayCurrencyRaw : 'USD'

  const effectiveHoldings = useMemo(
    () => holdings.map(h => ({ ...h, c: prices[h.t] ?? h.b ?? 0 })),
    [holdings, prices]
  )

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

  const totalRealizedGain = useMemo(
    () => realizedGains.reduce((s, g) => s + toDisplay(g.gain, g.currency), 0),
    [realizedGains, displayCurrency, exchangeRate.rate]
  )

  function addTransaction({ type, ticker, name, currency, exchange, date, qty, price }) {
    const tx = {
      id: crypto.randomUUID(),
      type,
      ticker: ticker.toUpperCase(),
      name,
      currency,
      date: date || null,
      qty,
      price,
    }
    if (exchange) tx.exchange = exchange
    setTransactions([...transactions, tx])
    snapAfterTx.current = true
  }

  function deleteTransaction(id) {
    setTransactions(transactions.filter(tx => tx.id !== id))
  }

  function delHolding(i) {
    const ticker = holdings[i].t
    setTransactions(transactions.filter(tx => tx.ticker !== ticker))
  }

  function editHolding(i, patch) {
    if (!patch.nm) return
    const ticker = holdings[i].t
    setTransactions(transactions.map(tx =>
      tx.ticker === ticker ? { ...tx, name: patch.nm } : tx
    ))
  }

  function upsertTodaySnap(total, currency) {
    if (holdings.length === 0 || !(total > 0)) return
    const today = new Date().toISOString().slice(0, 10)
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    setSnaps(prev => {
      const idx = prev.findIndex(s => s.date === today)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], total, currency }
        return next
      }
      const next = [...prev, { label, total, currency, date: today }]
      return next.length > 60 ? next.slice(-60) : next
    })
  }

  useEffect(() => {
    if (prevPriceLoading.current && !priceLoading && holdings.length > 0 && totalVal > 0) {
      upsertTodaySnap(totalVal, displayCurrency)
    }
    prevPriceLoading.current = priceLoading
  }, [priceLoading, totalVal, holdings.length, displayCurrency])

  useEffect(() => {
    if (snapAfterTx.current && holdings.length > 0 && totalVal > 0) {
      upsertTodaySnap(totalVal, displayCurrency)
      snapAfterTx.current = false
    }
  }, [totalVal, holdings.length, displayCurrency])

  function toggleCurrency() {
    if (!exchangeRate.rate) return
    setDisplayCurrency(prev => prev === 'USD' ? 'KRW' : 'USD')
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  function deleteSnap(index) {
    setSnaps(snaps.filter((_, i) => i !== index))
  }

  function restoreSnap(snap, index) {
    const next = [...snaps]
    next.splice(index, 0, snap)
    setSnaps(next)
  }

  return {
    transactions,
    holdings,
    effectiveHoldings,
    snaps,
    displayCurrency,
    exchangeRate,
    totalVal,
    totalCost,
    pl,
    ret,
    realizedGains,
    totalRealizedGain,
    toDisplay,
    prices,
    priceLoading,
    priceError,
    lastUpdatedAt,
    onRefresh: () => { refreshUsd(); refreshKrw() },
    addTransaction,
    deleteTransaction,
    delHolding,
    editHolding,
    toggleCurrency,
    clearSnaps,
    deleteSnap,
    restoreSnap,
  }
}
