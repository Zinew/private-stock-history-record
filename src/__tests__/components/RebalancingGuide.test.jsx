import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import RebalancingGuide from '../../components/RebalancingGuide.jsx'

const identity = n => n

const defaultProps = {
  holdings: [],
  cash: 0,
  targetWeights: {},
  totalVal: 0,
  displayCurrency: 'USD',
  toDisplay: identity,
}

function renderGuide(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <RebalancingGuide {...defaultProps} {...props} />
    </I18nextProvider>
  )
}

describe('RebalancingGuide', () => {
  it('목표 비중 없을 때 렌더링 안 함', () => {
    const { container } = renderGuide()
    expect(container.firstChild).toBeNull()
  })

  it('totalVal=0 이면 렌더링 안 함', () => {
    const { container } = renderGuide({
      targetWeights: { AAPL: 50 },
      totalVal: 0,
    })
    expect(container.firstChild).toBeNull()
  })

  it('목표 비중 설정 시 리밸런싱 카드 렌더링', () => {
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 60 },
      totalVal: 1000,
    })
    expect(screen.getByText('리밸런싱 가이드')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('현재 비중 > 목표 비중이면 매도 액션 표시', () => {
    // AAPL val=1000, totalVal=1000 → currentPct=100%, target=60% → diffPct=-40% → sell
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 60 },
      totalVal: 1000,
    })
    expect(screen.getByText('매도')).toBeInTheDocument()
  })

  it('현재 비중 < 목표 비중이면 매수 액션 표시', () => {
    // AAPL val=500, totalVal=1000 → currentPct=50%, target=80% → diffPct=+30% → buy
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 5, b: 100, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 80 },
      totalVal: 1000,
    })
    expect(screen.getByText('매수')).toBeInTheDocument()
  })

  it('목표 합계 100% 미달 시 미설정 힌트 표시', () => {
    renderGuide({
      holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 100, c: 100, currency: 'USD' }],
      targetWeights: { AAPL: 60 },
      totalVal: 1000,
    })
    expect(screen.getByText(/40\.0% 미설정/)).toBeInTheDocument()
  })
})
