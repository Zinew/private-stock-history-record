import { useState, useEffect } from 'react'
import { fetchEarningsCalendar } from '../utils/alphavantage.js'
import { fetchDividends } from '../utils/finnhub.js'
import i18n from '../i18n.js'

export function filterUsdHoldings(holdings) {
  return holdings.filter(h => (h.currency ?? 'USD') === 'USD')
}

export function mapToEarningsEvent(holding, entry) {
  return {
    date: entry.reportDate,
    type: 'earnings',
    ticker: entry.symbol,
    name: holding?.nm || entry.symbol,
    epsEstimate: entry.estimate,
    amount: null,
  }
}

export function mapToDividendEvent(holding, entry) {
  return {
    date: entry.exDate,
    type: 'dividend',
    ticker: entry.symbol ?? holding.t,
    name: holding?.nm || entry.symbol || holding.t,
    epsEstimate: null,
    amount: entry.amount ?? null,
  }
}

export function sortEventsByDate(events) {
  return events.filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date))
}

export function useCalendarEvents(holdings) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const usdHoldings = filterUsdHoldings(holdings)
    if (usdHoldings.length === 0) {
      setEvents([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let cancelled = false
    ;(async () => {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

        const [allEarnings, ...divArrays] = await Promise.all([
          fetchEarningsCalendar(),
          ...usdHoldings.map(h => fetchDividends(h.t, today, to)),
        ])
        if (cancelled) return

        const holdingMap = Object.fromEntries(usdHoldings.map(h => [h.t, h]))
        const tickers = new Set(usdHoldings.map(h => h.t))

        const earningsEvents = allEarnings
          .filter(e => tickers.has(e.symbol))
          .map(e => mapToEarningsEvent(holdingMap[e.symbol], e))

        const dividendEvents = usdHoldings.flatMap((h, i) =>
          divArrays[i]
            .filter(d => d.exDate && d.exDate >= today)
            .map(d => mapToDividendEvent(h, d))
        )

        setEvents(sortEventsByDate([...earningsEvents, ...dividendEvents]))
      } catch {
        if (!cancelled) setError(i18n.t('calendar.error'))
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [holdings])

  return { events, loading, error }
}
