import { useParams, Link } from 'react-router-dom'
import { getArticleBySlug, getArticles } from '../utils/articles.js'
import ArticleIllustration from '../components/learn/ArticleIllustration.jsx'
import AdBanner from '../components/AdBanner.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'
import { SITE_NAME } from '../config/site.js'

export default function ArticlePage() {
  const { slug } = useParams()
  const article = getArticleBySlug(slug)
  usePageMeta(article ? {
    title: `${article.title} — ${SITE_NAME}`,
    description: article.description,
    path: `/learn/${article.slug}`,
  } : { title: `글을 찾을 수 없습니다 — ${SITE_NAME}` })
  if (!article) {
    return (
      <div className="article-page">
        <p>글을 찾을 수 없습니다.</p>
        <Link to="/learn">← 목록으로</Link>
      </div>
    )
  }
  const all = getArticles()
  const idx = all.findIndex(a => a.slug === slug)
  const prev = all[idx + 1] ?? null
  const next = all[idx - 1] ?? null
  return (
    <div className="article-page">
      <div className="article-hero">
        <ArticleIllustration slug={slug} size={180} />
      </div>
      <h1 className="article-header-title">{article.title}</h1>
      <p className="article-meta">{article.date} · {article.minutes}분 읽기</p>
      <AdBanner slot="1234567891" />
      <div className="learn-content" dangerouslySetInnerHTML={{ __html: article.html }} />
      <AdBanner slot="1234567892" />
      <nav className="article-nav">
        {prev ? <Link to={`/learn/${prev.slug}`}>← {prev.title}</Link> : <span />}
        <Link to="/learn" className="article-nav-back">목록</Link>
        {next ? <Link to={`/learn/${next.slug}`}>{next.title} →</Link> : <span />}
      </nav>
    </div>
  )
}
