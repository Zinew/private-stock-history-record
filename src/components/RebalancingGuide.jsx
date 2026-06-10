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
      <h3 className="rebalancing-title">{t('holdings.rebalancingGuide')}</h3>
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
                <span className="rebal-ticker">{row.ticker}</span>
                {row.nm && row.nm !== row.ticker && (
                  <span className="rebal-name"> {row.nm}</span>
                )}
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
      {Math.abs(total - 100) >= 0.01 && (
        <p className="rebalancing-hint">
          {t('holdings.targetTotal')}: {total.toFixed(1)}%
          {total < 100 && ` — ${(100 - total).toFixed(1)}% ${t('holdings.unassigned')}`}
        </p>
      )}
    </div>
  )
}
