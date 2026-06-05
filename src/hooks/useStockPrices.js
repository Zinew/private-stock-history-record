import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchQuote } from '../utils/finnhub.js'

export function useStockPrices(tickers) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const tickersRef = useRef(tickers)

  useEffect(() => { tickersRef.current = tickers }, [tickers])

  const fetchAll = useCallback(() => {
    const list = tickersRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const result = {}
        for (const ticker of list) {
          const price = await fetchQuote(ticker)
          if (price !== null) result[ticker] = price
        }
        if (Object.keys(result).length === 0) {
          setError('주가 조회에 실패했습니다')
        } else {
          setPrices(prev => ({ ...prev, ...result }))
          setLastUpdatedAt(new Date())
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { prices, loading, error, lastUpdatedAt, refresh: fetchAll }
}
