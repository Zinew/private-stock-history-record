import { useState, useEffect } from 'react'
import { fetchEarningsCalendar } from '../utils/alphavantage.js'

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

    ;(async () => {
      try {
        const allEarnings = await fetchEarningsCalendar()
        const holdingMap = Object.fromEntries(usdHoldings.map(h => [h.t, h]))
        const tickers = new Set(usdHoldings.map(h => h.t))

        const mapped = allEarnings
          .filter(e => tickers.has(e.symbol))
          .map(e => mapToEarningsEvent(holdingMap[e.symbol], e))

        setEvents(sortEventsByDate(mapped))
      } catch {
        setError('이벤트 데이터 조회에 실패했습니다')
        setEvents([])
      } finally {
        setLoading(false)
      }
    })()
  }, [holdings])

  return { events, loading, error }
}
