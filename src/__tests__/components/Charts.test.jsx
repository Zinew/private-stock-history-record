import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import Charts from '../../components/Charts.jsx'

vi.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Doughnut: vi.fn(({ data }) => (
    <canvas
      data-testid="doughnut-chart"
      data-labels={JSON.stringify(data.labels)}
      data-colors={JSON.stringify(data.datasets[0]?.backgroundColor ?? [])}
    />
  )),
}))

const identity = n => n

const defaultProps = {
  holdings: [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 100, currency: 'USD' }],
  snaps: [],
  totalVal: 1000,
  displayCurrency: 'USD',
  toDisplay: identity,
  onDeleteSnap: vi.fn(),
  onRestoreSnap: vi.fn(),
  cash: 0,
}

function renderCharts(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <Charts {...defaultProps} {...props} />
    </I18nextProvider>
  )
}

describe('Charts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cash=0 이면 현금 슬라이스 없음', () => {
    renderCharts({ cash: 0 })
    const el = screen.getByTestId('doughnut-chart')
    const labels = JSON.parse(el.dataset.labels)
    expect(labels).not.toContain(i18n.t('holdings.cash'))
  })

  it('cash>0 이면 현금 슬라이스 포함', () => {
    renderCharts({ cash: 500 })
    const el = screen.getByTestId('doughnut-chart')
    const labels = JSON.parse(el.dataset.labels)
    expect(labels).toContain(i18n.t('holdings.cash'))
  })

  it('현금 슬라이스 색상은 #94a3b8', () => {
    renderCharts({ cash: 500 })
    const el = screen.getByTestId('doughnut-chart')
    const colors = JSON.parse(el.dataset.colors)
    expect(colors).toContain('#94a3b8')
  })

  it('cash=0 이면 현금 색상 없음', () => {
    renderCharts({ cash: 0 })
    const el = screen.getByTestId('doughnut-chart')
    const colors = JSON.parse(el.dataset.colors)
    expect(colors).not.toContain('#94a3b8')
  })
})
