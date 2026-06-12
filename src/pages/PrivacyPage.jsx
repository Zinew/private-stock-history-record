import { useTranslation } from 'react-i18next'

export default function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('privacy.title')}<span className="dot">.</span></h1>
      <p className="static-tagline">{t('privacy.lastUpdated')}</p>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.noCollectionTitle')}</h2>
        <p>{t('privacy.noCollectionBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.localDataTitle')}</h2>
        <p>{t('privacy.localDataBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.apisTitle')}</h2>
        <p>{t('privacy.apisBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.cookiesTitle')}</h2>
        <p>{t('privacy.cookiesBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.contactTitle')}</h2>
        <p>{t('privacy.contactBody')}</p>
      </section>
    </div>
  )
}
