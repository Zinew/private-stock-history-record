import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchQuote } from '../utils/finnhub.js'
import i18n from '../i18n.js'

const INTER_REQUEST_DELAY = 300  // ms between sequential ticker fetches
const RETRY_DELAYS = [3000, 6000, 12000]  // background retry schedule (ms)

export function useStockPrices(tickers) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const tickersRef = useRef(tickers)
  const prevTickersRef = useRef([])
  const hasFetchedRef = useRef(false)
  const fetchGenRef = useRef(0)

  useEffect(() => { tickersRef.current = tickers }, [tickers])

  const fetchAll = useCallback(() => {
    const gen = ++fetchGenRef.current
    const list = tickersRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      let failed = []
      try {
        const result = {}
        for (let i = 0; i < list.length; i++) {
          const ticker = list[i]
          const price = await fetchQuote(ticker)
          if (price !== null) result[ticker] = price
          else failed.push(ticker)
          if (i < list.length - 1) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY))
        }
        if (gen !== fetchGenRef.current) return
        if (Object.keys(result).length === 0) {
          setError(i18n.t('holdings.priceError'))
        } else {
          setPrices(prev => ({ ...prev, ...result }))
          setLastUpdatedAt(new Date())
        }
      } finally {
        if (gen === fetchGenRef.current) setLoading(false)
      }

      // Background retry — no loading spinner, silently fills in failed tickers
      for (const delay of RETRY_DELAYS) {
        if (gen !== fetchGenRef.current || failed.length === 0) break
        await new Promise(r => setTimeout(r, delay))
        if (gen !== fetchGenRef.current) break
        const retryResult = {}
        const nextFailed = []
        for (let i = 0; i < failed.length; i++) {
          const ticker = failed[i]
          const price = await fetchQuote(ticker)
          if (price !== null) retryResult[ticker] = price
          else nextFailed.push(ticker)
          if (i < failed.length - 1) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY))
        }
        if (gen !== fetchGenRef.current) break
        if (Object.keys(retryResult).length > 0) {
          setPrices(prev => ({ ...prev, ...retryResult }))
          setLastUpdatedAt(new Date())
        }
        failed = nextFailed
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
