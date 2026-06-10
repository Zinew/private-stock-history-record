import { useTranslation } from 'react-i18next'

// 보유 종목 없을 때의 온보딩 빈 상태 (데스크톱 테이블/모바일 리스트 공용)
export default function HoldingsEmptyState({ onAddFirst }) {
  const { t } = useTranslation()
  return (
    <div className="empty-state">
      <span className="empty-state-icon">📈</span>
      <h3 className="empty-state-title">{t('holdings.emptyTitle')}</h3>
      <p className="empty-state-desc">{t('holdings.emptyDesc')}</p>
      <button className="btn empty-state-cta" onClick={onAddFirst}>
        {t('holdings.addFirst')}
      </button>
    </div>
  )
}
