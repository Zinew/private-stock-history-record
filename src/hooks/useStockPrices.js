import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchQuote } from '../utils/finnhub.js'
import i18n from '../i18n.js'

export function useStockPrices(tickers) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const tickersRef = useRef(tickers)
  const prevTickersRef = useRef([])
  const hasFetchedRef = useRef(false)

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
          setError(i18n.t('holdings.priceError'))
        } else {
          setPrices(prev => ({ ...prev, ...result }))
          setLastUpdatedAt(new Date())
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      prevTickersRef.current = tickers
      fetchAll()
      return
    }
    const newTickers = tickers.filter(t => !prevTickersRef.current.includes(t))
    prevTickersRef.current = tickers
    if (newTickers.length > 0) fetchAll()
  }, [tickers, fetchAll])

  return { prices, loading, error, lastUpdatedAt, refresh: fetchAll }
}
