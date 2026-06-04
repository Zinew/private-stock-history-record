import { fmtCurrency, pct } from '../utils/format.js'

function formatUpdatedAt(isoString) {
  if (!isoString) return ''
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (mins < 1) return '방금 업데이트'
  if (mins < 60) return `${mins}분 전`
  return `${Math.floor(mins / 60)}시간 전`
}

export default function Header({ totalVal, totalCost, pl, ret, displayCurrency, onToggleCurrency, exchangeRate }) {
  const hasRate = !!exchangeRate.rate

  return (
    <header>
      <div className="brand">
        <h1>Ledger<span className="dot">.</span></h1>
        <span className="tag">portfolio tracker · v1</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
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
            <div className="label">총 평가액</div>
            <div className="val">{fmtCurrency(totalVal, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">총 매입액</div>
            <div className="val">{fmtCurrency(totalCost, displayCurrency)}</div>
          </div>
          <div className="sum-item">
            <div className="label">평가손익</div>
            <div className={`val ${pl >= 0 ? 'pos' : 'neg'}`}>
              {pl >= 0 ? '+' : ''}{fmtCurrency(pl, displayCurrency)}
            </div>
          </div>
          <div className="sum-item">
            <div className="label">수익률</div>
            <div className={`val ${ret >= 0 ? 'pos' : 'neg'}`}>{pct(ret)}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
