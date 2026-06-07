import { useTranslation } from 'react-i18next'

export default function HelpPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('help.title')}</h1>

      <h2>{t('help.gettingStartedTitle')}</h2>
      <p>{t('help.gettingStartedBody')}</p>

      <h2>{t('help.sellTitle')}</h2>
      <p>{t('help.sellBody')}</p>

      <h2>{t('help.calendarTitle')}</h2>
      <p>{t('help.calendarBody')}</p>

      <h2>{t('help.backupTitle')}</h2>
      <p>{t('help.backupBody')}</p>

      <h2>{t('help.faqTitle')}</h2>
      <div className="static-faq-item">
        <p className="static-faq-q">{t('help.faq1Q')}</p>
        <p className="static-faq-a">{t('help.faq1A')}</p>
      </div>
      <div className="static-faq-item">
        <p className="static-faq-q">{t('help.faq2Q')}</p>
        <p className="static-faq-a">{t('help.faq2A')}</p>
      </div>
      <div className="static-faq-item">
        <p className="static-faq-q">{t('help.faq3Q')}</p>
        <p className="static-faq-a">{t('help.faq3A')}</p>
      </div>
    </div>
  )
}
