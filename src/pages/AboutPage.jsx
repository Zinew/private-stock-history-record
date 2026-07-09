import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta.js'
import { PAGE_META, CONTACT_EMAIL } from '../config/site.js'

export default function AboutPage() {
  const { t } = useTranslation()
  usePageMeta({ ...PAGE_META['/about'], path: '/about' })
  return (
    <div className="static-page">
      <h1>{t('about.title')}<span className="dot">.</span></h1>
      <p className="static-tagline">{t('about.tagline')}</p>

      <section className="static-section">
        <h2 className="holdings-title">{t('about.featuresTitle')}</h2>
        <ul className="static-list">
          <li>{t('about.feature1')}</li>
          <li>{t('about.feature2')}</li>
          <li>{t('about.feature3')}</li>
          <li>{t('about.feature4')}</li>
          <li>{t('about.feature5')}</li>
        </ul>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('about.whyTitle')}</h2>
        <p>{t('about.whyBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('about.dataTitle')}</h2>
        <p>{t('about.dataBody')}</p>
      </section>

      {CONTACT_EMAIL && (
        <section className="static-section">
          <h2 className="holdings-title">{t('about.contactTitle')}</h2>
          <p>{t('about.contactBody')} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </section>
      )}
    </div>
  )
}
