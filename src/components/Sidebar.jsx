import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const NAV_ITEMS = [
  { path: '/', key: 'sidebar.dashboard', icon: '📊' },
  { path: '/calendar', key: 'sidebar.calendar', icon: '📅' },
  { path: '/news', key: 'sidebar.news', icon: '📰' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <div className={`sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">LEDGER.</span>
          <button className="sidebar-close" onClick={onClose} aria-label={t('sidebar.closeMenu')}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, key, icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item${pathname === path ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{icon}</span>
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-lang">
          <button
            className={`lang-btn${i18n.language === 'ko' ? ' active' : ''}`}
            onClick={() => i18n.changeLanguage('ko')}
          >KO</button>
          <button
            className={`lang-btn${i18n.language === 'en' ? ' active' : ''}`}
            onClick={() => i18n.changeLanguage('en')}
          >EN</button>
        </div>
        <div className="sidebar-footer">Ledger v2</div>
      </div>
    </>
  )
}
