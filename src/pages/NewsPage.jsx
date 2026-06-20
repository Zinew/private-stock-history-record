import { useEffect, useState } from 'react'
import { useStockNews } from '../hooks/useStockNews.js'
import { useTranslation } from 'react-i18next'
import { analyzeSentiment } from '../utils/sentiment.js'

function SentimentDot({ sentiment }) {
  if (!sentiment || sentiment.label === 'neutral' || sentiment.score < 0.70) return null
  const cls = sentiment.label === 'positive' ? 'positive' : 'negative'
  return <span className={`news-sentiment-dot ${cls}`} title={`${sentiment.label} ${Math.round(sentiment.score * 100)}%`} />
}

function StockNewsSection({ holding }) {
  const currency = holding.currency ?? 'USD'
  const { articles, loading, error, retry } = useStockNews(holding.t, currency, holding.nm)
  const { t } = useTranslation()
  const [sentiments, setSentiments] = useState({})

  useEffect(() => {
    if (!articles.length) return
    setSentiments({})
    let cancelled = false
    ;(async () => {
      for (let i = 0; i < articles.length; i++) {
        if (cancelled) break
        const lang = currency === 'KRW' ? 'ko' : 'en'
        const result = await analyzeSentiment(articles[i].title, { lang })
        if (!cancelled && result) setSentiments(prev => ({ ...prev, [i]: result }))
      }
    })()
    return () => { cancelled = true }
  }, [articles])

  return (
    <div className="news-section">
      <div className="news-section-header">
        <span className="news-section-ticker">{holding.t}</span>
        {holding.nm && holding.nm !== holding.t && (
          <span className="news-section-name">{holding.nm}</span>
        )}
        <span className={`news-currency-badge ${currency.toLowerCase()}`}>
          {currency}
        </span>
      </div>

      {loading && <p className="news-empty">{t('news.loading')}</p>}
      {error && (
        <div className="news-error">
          ⚠ {error}
          <button className="btn-retry" onClick={retry}>↺ {t('common.retry')}</button>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="news-empty">{t('news.empty')}</p>
      )}

      {!loading && !error && articles.length > 0 && (
        <div>
          {articles.map((article, i) => (
            <div key={i} className="news-card">
              <div className="news-card-header">
                <a
                  className="news-card-title"
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {article.title}
                </a>
                <SentimentDot sentiment={sentiments[i]} />
              </div>
              {article.summary && (
                <p className="news-card-summary">{article.summary}</p>
              )}
              <span className="news-card-meta">
                {article.source} · {article.publishedAt}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewsPage({ portfolio }) {
  const holdings = portfolio?.holdings ?? []
  const { t } = useTranslation()

  if (holdings.length === 0) {
    return (
      <div className="holdings">
        <h2 className="news-heading">{t('news.title')}</h2>
        <p className="news-empty">{t('news.noHoldings')}</p>
      </div>
    )
  }

  return (
    <div className="holdings">
      <div className="news-header-row">
        <h2 className="news-heading">{t('news.title')}</h2>
        <div className="news-sentiment-legend">
          <span className="news-sentiment-dot positive" />
          <span className="news-legend-label">{t('news.sentimentPositive')}</span>
          <span className="news-sentiment-dot negative" />
          <span className="news-legend-label">{t('news.sentimentNegative')}</span>
        </div>
      </div>
      {holdings.map(h => (
        <StockNewsSection key={h.t} holding={h} />
      ))}
    </div>
  )
}
