import { useTranslation } from 'react-i18next'

export default function HelpPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('help.title')}<span className="dot">.</span></h1>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.gettingStartedTitle')}</h2>
        <p>{t('help.gettingStartedBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.sellTitle')}</h2>
        <p>{t('help.sellBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.portfolioTitle')}</h2>
        <p>{t('help.portfolioBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.calendarTitle')}</h2>
        <p>{t('help.calendarBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.backupTitle')}</h2>
        <p>{t('help.backupBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.faqTitle')}</h2>
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
      </section>
    </div>
  )
}
