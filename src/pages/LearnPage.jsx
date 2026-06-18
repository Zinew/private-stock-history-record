import { Link } from 'react-router-dom'
import { getArticles } from '../utils/articles.js'
import ArticleIllustration from '../components/learn/ArticleIllustration.jsx'
import AdBanner from '../components/AdBanner.jsx'

export default function LearnPage() {
  const articles = getArticles()
  return (
    <div className="learn-page">
      <h1>투자 가이드<span className="dot">.</span></h1>
      <p className="learn-tagline">한국·미국 주식 투자 실전 지식을 쉽게 정리했습니다</p>
      <AdBanner slot="1234567890" />
      {articles.map(article => (
        <Link key={article.slug} to={`/learn/${article.slug}`} className="article-card">
          <div className="article-card-thumb">
            <ArticleIllustration slug={article.slug} size={72} />
          </div>
          <div className="article-card-body">
            <p className="article-card-title">{article.title}</p>
            <p className="article-card-desc">{article.description}</p>
            <span className="article-card-meta">{article.date} · {article.minutes}분</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
