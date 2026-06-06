import { useState, useEffect } from 'react'
import { fetchEarnings, fetchDividends } from '../utils/finnhub.js'

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

export function filterUsdHoldings(holdings) {
  return holdings.filter(h => (h.currency ?? 'USD') === 'USD')
}

export function mapEarningsToEvents(h, earnings) {
  const name = h.nm || h.t
  return earnings.map(e => ({
    date: e.date,
    type: 'earnings',
    ticker: h.t,
    name,
    epsEstimate: e.epsEstimate ?? null,
    amount: null,
  }))
}

export function mapDividendsToEvents(h, dividends) {
  const name = h.nm || h.t
  return dividends.map(d => ({
    date: d.exDividendDate,
    type: 'dividend',
    ticker: h.t,
    name,
    epsEstimate: null,
    amount: d.amount ?? null,
  }))
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

    const from = dateStr(new Date())
    const toDate = new Date()
    toDate.setDate(toDate.getDate() + 90)
    const to = dateStr(toDate)

    ;(async () => {
      try {
        const perHolding = await Promise.all(
          usdHoldings.map(async h => {
            const [earnings, dividends] = await Promise.all([
              fetchEarnings(h.t, from, to),
              fetchDividends(h.t, from, to),
            ])
            return [
              ...mapEarningsToEvents(h, earnings),
              ...mapDividendsToEvents(h, dividends),
            ]
          })
        )
        setEvents(sortEventsByDate(perHolding.flat()))
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
