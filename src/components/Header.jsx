import { fmtCurrency, pct } from '../utils/format.js'
import { useTranslation } from 'react-i18next'

export default function Header({ totalVal, totalCost, pl, ret, displayCurrency, onToggleCurrency, exchangeRate, onMenuOpen, totalRealizedGain, hasRealizedGains }) {
  const { t } = useTranslation()
  const hasRate = !!exchangeRate.rate

  function formatUpdatedAt(isoString) {
    if (!isoString) return ''
    const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
    if (mins < 1) return t('header.justUpdated')
    if (mins < 60) return t('common.minutesAgo', { count: mins })
    return t('common.hoursAgo', { count: Math.floor(mins / 60) })
  }

  return (
    <header>
      <div className="brand">
        <button className="menu-btn" onClick={onMenuOpen} aria-label={t('sidebar.openMenu')}>☰</button>
        <h1>Ledger<span className="dot">.</span></h1>
        <span className="tag">portfolio tracker</span>
      </div>
      <div className="header-right">
        {hasRate && (
          <div className="rate-bar">
            <div className="currency-toggle">
              <button
                className={`currency-btn ${displayCurrency === 'USD' ? 'active' : ''}`}
                onClick={onToggleCurrency}
              >USD</button>
              <button
                className={`currency-btn ${displayCurrency === 'KRW' ? 'active' : ''}`}
                onClick={onToggleCurrency}
              >KRW</button>
            </div>
            <span className="rate-label">
              1 USD = ₩{exchangeRate.rate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} · {formatUpdatedAt(exchangeRate.updatedAt)}
            </span>
          </div>
        )}
        <div className="summary">
          <div className="sum-item">
            <div className="label">{t('header.totalValue')}</div>
            <div className="val">{fmtCurrency(totalVal, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">{t('header.totalCost')}</div>
            <div className="val">{fmtCurrency(totalCost, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">{t('header.unrealizedPnl')}</div>
            <div className={`val ${pl >= 0 ? 'pos' : 'neg'}`}>
              {pl >= 0 ? '+' : ''}{fmtCurrency(pl, displayCurrency)}
            </div>
          </div>
          <div className="sum-item">
            <div className="label">{t('header.returnRate')}</div>
            <div className={`val ${ret >= 0 ? 'pos' : 'neg'}`}>{pct(ret)}</div>
          </div>
          {hasRealizedGains && (
            <div className="sum-item">
              <div className="label">{t('header.realizedGain')}</div>
              <div className={`val ${totalRealizedGain >= 0 ? 'pos' : 'neg'}`}>
                {totalRealizedGain >= 0 ? '+' : ''}{fmtCurrency(totalRealizedGain, displayCurrency)}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
