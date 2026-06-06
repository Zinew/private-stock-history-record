import { useStockNews } from '../hooks/useStockNews.js'

function StockNewsSection({ holding }) {
  const currency = holding.currency ?? 'USD'
  const { articles, loading, error } = useStockNews(holding.t, currency)

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

      {loading && <p className="news-empty">조회 중…</p>}
      {error && <p className="news-error">⚠ {error}</p>}

      {!loading && !error && articles.length === 0 && (
        <p className="news-empty">최근 뉴스가 없습니다.</p>
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

  if (holdings.length === 0) {
    return (
      <div className="holdings">
        <h2 className="news-heading">뉴스</h2>
        <p className="news-empty">보유 종목을 추가하면 관련 뉴스가 표시됩니다.</p>
      </div>
    )
  }

  return (
    <div className="holdings">
      <h2 className="news-heading">뉴스</h2>
      {holdings.map(h => (
        <StockNewsSection key={h.t} holding={h} />
      ))}
    </div>
  )
}
