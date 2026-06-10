import { useTranslation } from 'react-i18next'
import { fmtCurrency, pctArrow, fmtArrow } from '../utils/format.js'
import { computeHoldingView } from '../utils/holdingView.js'
import HoldingsEmptyState from './HoldingsEmptyState.jsx'

// 데스크톱 보유 종목 테이블 (보유 행 + CASH 행). 상태 없음 — 액션은 콜백으로 위임
export default function HoldingsDesktopTable({
  holdings, totalVal, displayCurrency, toDisplay,
  prices, targetWeights, cash,
  onEditRow, onDelete, onCashEdit, onAddFirst,
}) {
  const { t } = useTranslation()
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t('holdings.ticker')}</th><th>{t('holdings.qty')}</th><th>{t('holdings.avgCost')}</th><th>{t('holdings.currentPrice')}</th>
            <th>{t('holdings.value')} ({dispSym})</th><th>{t('holdings.pnl')} ({dispSym})</th><th>{t('holdings.returnRate')}</th><th>{t('holdings.weight')}</th><th>{t('holdings.targetWeight')}</th><th></th>
          </tr>
        </thead>
        <tbody>
          {holdings.length === 0 ? (
            <tr>
              <td colSpan={10}>
                <HoldingsEmptyState onAddFirst={onAddFirst} />
              </td>
            </tr>
          ) : (
            holdings.map((h, i) => {
              const { hCur, val, p, r, w } = computeHoldingView(h, { toDisplay, totalVal })
              const isLive = prices[h.t] !== undefined
              return (
                <tr key={i}>
                  <td>
                    <span className="tick">
                      {h.t}
                      {h.nm && <small>{h.nm}</small>}
                    </span>
                  </td>
                  <td>{h.q.toLocaleString()}</td>
                  <td>{fmtCurrency(h.b, hCur)}</td>
                  <td>
                    {isLive && <span className="live-dot">●</span>}
                    {fmtCurrency(h.c, hCur)}
                  </td>
                  <td>{fmtCurrency(val, displayCurrency)}</td>
                  <td className={p >= 0 ? 'pos' : 'neg'}>{fmtArrow(p, displayCurrency)}</td>
                  <td className={r >= 0 ? 'pos' : 'neg'}>{pctArrow(r)}</td>
                  <td>{w.toFixed(1)}%</td>
                  <td>{targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}</td>
                  <td>
                    <button className="edit" onClick={() => onEditRow(i)} title={t('holdings.edit')}>✎</button>
                    <button className="del" onClick={() => onDelete(i)} title={t('holdings.delete')}>✕</button>
                  </td>
                </tr>
              )
            })
          )}
          <tr className="cash-row">
            <td><span className="tick">CASH<small>{t('holdings.cash')}</small></span></td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>{fmtCurrency(Number(cash) || 0, displayCurrency)}</td>
            <td>—</td>
            <td>—</td>
            <td>{totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%</td>
            <td>{targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}</td>
            <td>
              <button className="edit" onClick={onCashEdit} title={t('holdings.edit')}>✎</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
