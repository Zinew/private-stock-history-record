import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtCurrency } from '../utils/format.js'
import { computeRebalancing, totalTargetWeight } from '../utils/rebalancing.js'

export default function RebalancingGuide({ holdings, cash, targetWeights, totalVal, displayCurrency, toDisplay }) {
  const { t } = useTranslation()
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  const rebalancingRows = useMemo(() => {
    if (Object.keys(targetWeights).length === 0 || totalVal <= 0) return []
    const allRows = [
      ...holdings.map(h => ({
        t: h.t,
        nm: h.nm || h.t,
        displayVal: toDisplay(h.q * h.c, h.currency ?? 'USD'),
      })),
      { t: 'cash', nm: t('holdings.cash'), displayVal: Number(cash) || 0 },
    ]
    return computeRebalancing(allRows, targetWeights, totalVal)
  }, [holdings, cash, targetWeights, totalVal, toDisplay, t])

  if (rebalancingRows.length === 0) return null

  const total = totalTargetWeight(targetWeights)

  return (
    <div className="rebalancing-card">
      <h2 className="holdings-title">{t('holdings.rebalancingGuide')}</h2>

      {/* 데스크톱: 테이블 */}
      <table className="rebalancing-table">
        <thead>
          <tr>
            <th>{t('holdings.ticker')}</th>
            <th>{t('holdings.weight')}</th>
            <th>{t('holdings.targetWeight')}</th>
            <th>±%</th>
            <th>{t('holdings.value')} ({dispSym})</th>
          </tr>
        </thead>
        <tbody>
          {rebalancingRows.map(row => (
            <tr key={row.ticker}>
              <td>
                <span className="tick">
                  {row.ticker}
                  {row.nm && row.nm !== row.ticker && <small>{row.nm}</small>}
                </span>
              </td>
              <td>{row.currentPct.toFixed(1)}%</td>
              <td>{row.targetPct.toFixed(1)}%</td>
              <td className={row.diffPct >= 0 ? 'pos' : 'neg'}>
                {row.diffPct >= 0 ? '+' : ''}{row.diffPct.toFixed(1)}%
              </td>
              <td>
                <span className={`rebal-action rebal-action--${row.action}`}>
                  {t(`holdings.${row.action}`)}
                </span>
                {row.action !== 'hold' && ` ${fmtCurrency(row.amount, displayCurrency)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 모바일: 카드 목록 */}
      <div className="rebalancing-mobile-list">
        {rebalancingRows.map(row => (
          <div className="rebal-item-card" key={row.ticker}>
            <div className="rebal-item-header">
              <div className="rebal-item-name">
                <span className="rebal-ticker">{row.ticker}</span>
                {row.nm && row.nm !== row.ticker && (
                  <span className="rebal-name"> {row.nm}</span>
                )}
              </div>
              <span className={`rebal-action rebal-action--${row.action}`}>
                {t(`holdings.${row.action}`)}
              </span>
            </div>
            <div className="rebal-item-body">
              <span className="rebal-item-pct">
                {row.currentPct.toFixed(1)}% → {row.targetPct.toFixed(1)}%
              </span>
              <span className={row.diffPct >= 0 ? 'pos' : 'neg'}>
                {row.diffPct >= 0 ? '+' : ''}{row.diffPct.toFixed(1)}%
              </span>
              {row.action !== 'hold' && (
                <span className="rebal-item-amount">{fmtCurrency(row.amount, displayCurrency)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {Math.abs(total - 100) >= 0.01 && (
        <p className="rebalancing-hint">
          {t('holdings.targetTotal')}: {total.toFixed(1)}%
          {total < 100 && ` — ${(100 - total).toFixed(1)}% ${t('holdings.unassigned')}`}
        </p>
      )}
    </div>
  )
}
