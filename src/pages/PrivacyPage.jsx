import { useTranslation } from 'react-i18next'

export default function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('privacy.title')}</h1>
      <p className="static-tagline">{t('privacy.lastUpdated')}</p>

      <h2>{t('privacy.noCollectionTitle')}</h2>
      <p>{t('privacy.noCollectionBody')}</p>

      <h2>{t('privacy.localDataTitle')}</h2>
      <p>{t('privacy.localDataBody')}</p>

      <h2>{t('privacy.apisTitle')}</h2>
      <p>{t('privacy.apisBody')}</p>

      <h2>{t('privacy.cookiesTitle')}</h2>
      <p>{t('privacy.cookiesBody')}</p>

      <h2>{t('privacy.contactTitle')}</h2>
      <p>{t('privacy.contactBody')}</p>
    </div>
  )
}
