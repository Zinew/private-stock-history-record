import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: '대시보드', icon: '📊' },
  { path: '/calendar', label: '캘린더', icon: '📅' },
  { path: '/news', label: '뉴스', icon: '📰' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation()

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <div className={`sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">LEDGER.</span>
          <button className="sidebar-close" onClick={onClose} aria-label="메뉴 닫기">✕</button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item${pathname === path ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">Ledger v2</div>
      </div>
    </>
  )
}
