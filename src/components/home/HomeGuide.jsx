import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getArticles } from '../../utils/articles.js'

// 홈 하단 서비스 소개·사용법·FAQ (SEO 콘텐츠 — 프리렌더 정적 HTML과 동일 문구, 출처: i18n homeGuide)
export default function HomeGuide() {
  const { t } = useTranslation()
  const articles = getArticles().slice(0, 6)
  return (
    <div className="home-guide">
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.introTitle')}</h2>
        <p>{t('homeGuide.introBody')}</p>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.stepsTitle')}</h2>
        <ol className="home-guide-steps">
          {[1, 2, 3].map(i => (
            <li key={i}><strong>{t(`homeGuide.step${i}Title`)}</strong> — {t(`homeGuide.step${i}Body`)}</li>
          ))}
        </ol>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.featuresTitle')}</h2>
        <ul className="static-list">
          {[1, 2, 3, 4].map(i => <li key={i}>{t(`homeGuide.feature${i}`)}</li>)}
        </ul>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.articlesTitle')}</h2>
        <ul className="home-guide-articles">
          {articles.map(a => (
            <li key={a.slug}><Link to={`/learn/${a.slug}`}>{a.title}</Link> — {a.description}</li>
          ))}
        </ul>
        <Link className="home-guide-more" to="/learn">{t('homeGuide.articlesMore')}</Link>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.faqTitle')}</h2>
        {[1, 2, 3, 4, 5].map(i => (
          <details key={i} className="home-guide-faq">
            <summary>{t(`homeGuide.faq${i}q`)}</summary>
            <p>{t(`homeGuide.faq${i}a`)}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
