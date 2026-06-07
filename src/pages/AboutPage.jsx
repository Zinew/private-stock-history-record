import { useTranslation } from 'react-i18next'

export default function AboutPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('about.title')}</h1>
      <p className="static-tagline">{t('about.tagline')}</p>

      <h2>{t('about.featuresTitle')}</h2>
      <ul>
        <li>{t('about.feature1')}</li>
        <li>{t('about.feature2')}</li>
        <li>{t('about.feature3')}</li>
        <li>{t('about.feature4')}</li>
        <li>{t('about.feature5')}</li>
      </ul>

      <h2>{t('about.whyTitle')}</h2>
      <p>{t('about.whyBody')}</p>

      <h2>{t('about.dataTitle')}</h2>
      <p>{t('about.dataBody')}</p>
    </div>
  )
}
