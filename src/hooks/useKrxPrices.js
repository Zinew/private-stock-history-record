import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchKrxQuote } from '../utils/stockSearch.js'
import i18n from '../i18n.js'

const INTER_REQUEST_DELAY = 300  // ms between sequential ticker fetches
const RETRY_DELAYS = [3000, 6000, 12000]  // background retry schedule (ms)

export function useKrxPrices(krwHoldings) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const holdingsRef = useRef(krwHoldings)
  const prevHoldingsRef = useRef([])
  const hasFetchedRef = useRef(false)
  const fetchGenRef = useRef(0)

  useEffect(() => { holdingsRef.current = krwHoldings }, [krwHoldings])

  const fetchAll = useCallback(() => {
    const gen = ++fetchGenRef.current
    const list = holdingsRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      let failed = []
      try {
        const result = {}
        for (let i = 0; i < list.length; i++) {
          const { t, exchange } = list[i]
          const price = await fetchKrxQuote(t, exchange)
          if (price !== null) result[t] = price
          else failed.push({ t, exchange })
          if (i < list.length - 1) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY))
        }
        if (gen !== fetchGenRef.current) return
        if (Object.keys(result).length === 0) {
          setError(i18n.t('holdings.krxPriceError'))
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
          const { t, exchange } = failed[i]
          const price = await fetchKrxQuote(t, exchange)
          if (price !== null) retryResult[t] = price
          else nextFailed.push({ t, exchange })
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
      prevHoldingsRef.current = krwHoldings
      fetchAll()
      return
    }
    const prevTickers = prevHoldingsRef.current.map(h => h.t)
    const hasNew = krwHoldings.some(h => !prevTickers.includes(h.t))
    prevHoldingsRef.current = krwHoldings
    if (hasNew) fetchAll()
  }, [krwHoldings, fetchAll])

  return { prices, loading, error, lastUpdatedAt, refresh: fetchAll }
}
