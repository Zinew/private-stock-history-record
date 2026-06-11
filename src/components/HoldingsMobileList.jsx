import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtCurrency, pctArrow } from '../utils/format.js'
import { computeHoldingView } from '../utils/holdingView.js'
import HoldingsEmptyState from './HoldingsEmptyState.jsx'

// 모바일 보유 종목 카드 리스트 (접힘/펼침 카드 + CASH 카드)
// 접힘 상태(expandedCards)는 순수 UI 상태라 이 컴포넌트에 지역화
export default function HoldingsMobileList({
  holdings, totalVal, displayCurrency, toDisplay,
  targetWeights, cash,
  onEditRow, onCashEdit, onAddFirst,
}) {
  const { t } = useTranslation()
  const [expandedCards, setExpandedCards] = useState({})
  const toggleCard = (ticker) =>
    setExpandedCards(prev => ({ ...prev, [ticker]: !prev[ticker] }))

  return (
    <div className="holdings-mobile-list">
      {holdings.length === 0 ? (
        <HoldingsEmptyState onAddFirst={onAddFirst} />
      ) : holdings.map((h, i) => {
        const { hCur, val, r, w } = computeHoldingView(h, { toDisplay, totalVal })
        const market = h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : 'US'
        return (
          <div className="holding-card" key={i}>
            <div className="holding-card-header">
              <div className="holding-card-name-row">
                <div className="holding-card-name">
                  <span className="card-name-text">{h.nm || h.t}</span>
                  <span className="market-badge">{market}</span>
                </div>
                <button
                  className={`mobile-card-toggle${expandedCards[h.t] ? ' expanded' : ''}`}
                  onClick={() => toggleCard(h.t)}
                  title={expandedCards[h.t] ? t('common.collapse') : t('common.expand')}
                >
                  <span className="chevron" />
                </button>
              </div>
              <div className="holding-card-val-row">
                <div className="holding-card-val">{fmtCurrency(val, displayCurrency)}</div>
                <div className={`holding-card-rate ${r >= 0 ? 'pos' : 'neg'}`}>{pctArrow(r)}</div>
              </div>
            </div>
            {expandedCards[h.t] && (
              <>
                <div className="holding-card-stats">
                  <div>
                    <div className="holding-card-stat-label">{t('addHolding.ticker')}</div>
                    <div className="holding-card-stat-val">{h.t}</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.qty')}</div>
                    <div className="holding-card-stat-val">{h.q.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.currentPrice')}</div>
                    <div className="holding-card-stat-val">{fmtCurrency(h.c, hCur)}</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.avgCost')}</div>
                    <div className="holding-card-stat-val">{fmtCurrency(h.b, hCur)}</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.weight')}</div>
                    <div className="holding-card-stat-val">{w.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
                    <div className="holding-card-stat-val">
                      {targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}
                    </div>
                  </div>
                </div>
                <div className="holding-card-actions">
                  <button className="edit" onClick={() => onEditRow(i)} title={t('holdings.edit')}>✎</button>
                </div>
              </>
            )}
          </div>
        )
      })}
      <div className="holding-card cash-card">
        <div className="holding-card-header">
          <div className="holding-card-name-row">
            <div className="holding-card-name">
              <span className="card-name-text">{t('holdings.cash')}</span>
            </div>
            <button
              className={`mobile-card-toggle${expandedCards.__cash__ ? ' expanded' : ''}`}
              onClick={() => toggleCard('__cash__')}
              title={expandedCards.__cash__ ? t('common.collapse') : t('common.expand')}
            >
              <span className="chevron" />
            </button>
          </div>
          <div className="holding-card-val-row">
            <div className="holding-card-val">{fmtCurrency(Number(cash) || 0, displayCurrency)}</div>
          </div>
        </div>
        {expandedCards.__cash__ && (
          <>
            <div className="holding-card-stats">
              <div>
                <div className="holding-card-stat-label">{t('holdings.weight')}</div>
                <div className="holding-card-stat-val">
                  {totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
              <div>
                <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
                <div className="holding-card-stat-val">
                  {targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}
                </div>
              </div>
            </div>
            <div className="holding-card-actions">
              <button className="edit" onClick={onCashEdit} title={t('holdings.edit')}>✎</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
