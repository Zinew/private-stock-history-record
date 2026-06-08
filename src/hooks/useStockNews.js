import { useState, useEffect, useCallback } from 'react'
import { fetchCompanyNews } from '../utils/finnhub.js'
import { fetchNaverNews } from '../utils/naverNews.js'
import i18n from '../i18n.js'

export function useStockNews(ticker, currency, name) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setArticles([])

    ;(async () => {
      try {
        let result
        if (currency === 'KRW') {
          result = await fetchNaverNews(ticker, name)
          if (result === null) throw new Error('fetch failed')
        } else {
          const to = new Date().toISOString().slice(0, 10)
          const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          result = await fetchCompanyNews(ticker, from, to)
        }
        if (!cancelled) setArticles(result)
      } catch {
        if (!cancelled) setError(i18n.t('news.error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [ticker, currency, retryCount])

  return { articles, loading, error, retry }
}
