import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchKrxQuote } from '../utils/stockSearch.js'
import i18n from '../i18n.js'

export function useKrxPrices(krwHoldings) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const holdingsRef = useRef(krwHoldings)
  const prevHoldingsRef = useRef([])
  const hasFetchedRef = useRef(false)

  useEffect(() => { holdingsRef.current = krwHoldings }, [krwHoldings])

  const fetchAll = useCallback(() => {
    const list = holdingsRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const result = {}
        for (const { t, exchange } of list) {
          const price = await fetchKrxQuote(t, exchange)
          if (price !== null) result[t] = price
        }
        if (Object.keys(result).length === 0) {
          setError(i18n.t('holdings.krxPriceError'))
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
