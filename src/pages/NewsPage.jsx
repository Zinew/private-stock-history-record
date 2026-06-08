import { useStockNews } from '../hooks/useStockNews.js'
import { useTranslation } from 'react-i18next'

function StockNewsSection({ holding }) {
  const currency = holding.currency ?? 'USD'
  const { articles, loading, error, retry } = useStockNews(holding.t, currency, holding.nm)
  const { t } = useTranslation()

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
        <p className="news-error">
          ⚠ {error}
          <button className="btn-retry" onClick={retry}>↺ {t('common.retry')}</button>
        </p>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="news-empty">{t('news.empty')}</p>
      )}

      {!loading && !error && articles.length > 0 && (
        <div>
          {articles.map((article, i) => (
            <div key={i} className="news-card">
              <a
                className="news-card-title"
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {article.title}
              </a>
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
      <h2 className="news-heading">{t('news.title')}</h2>
      {holdings.map(h => (
        <StockNewsSection key={h.t} holding={h} />
      ))}
    </div>
  )
}
