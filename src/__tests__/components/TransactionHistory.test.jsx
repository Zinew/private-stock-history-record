import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import TransactionHistory from '../../components/TransactionHistory.jsx'

const mockTxs = [
  { id: 'tx1', type: 'buy', ticker: 'AAPL', name: 'Apple Inc.', qty: 10, price: 150, currency: 'USD', date: '2026-05-01' },
  { id: 'tx2', type: 'sell', ticker: 'MSFT', name: 'Microsoft', qty: 5, price: 200, currency: 'USD', date: '2026-04-01' },
]

function renderTx(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TransactionHistory
        transactions={[]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  )
}

describe('TransactionHistory', () => {
  it('거래 없을 때 빈 안내 메시지', () => {
    renderTx()
    expect(screen.getAllByText('거래 이력이 없습니다').length).toBeGreaterThan(0)
  })

  it('거래 있을 때 테이블에 ticker 표시', () => {
    const { container } = renderTx({ transactions: mockTxs })
    const table = container.querySelector('.table-scroll')
    expect(table).toHaveTextContent('AAPL')
  })
})

describe('TransactionHistory 모바일 카드', () => {
  it('tx-mobile-list 컨테이너 존재', () => {
    const { container } = renderTx()
    expect(container.querySelector('.tx-mobile-list')).toBeInTheDocument()
  })

  it('거래가 있을 때 tx-card 렌더링', () => {
    const { container } = renderTx({ transactions: mockTxs })
    expect(container.querySelectorAll('.tx-card')).toHaveLength(2)
  })

  it('카드에 ticker와 날짜 표시', () => {
    const { container } = renderTx({ transactions: mockTxs })
    const list = container.querySelector('.tx-mobile-list')
    expect(list).toHaveTextContent('AAPL')
    expect(list).toHaveTextContent('2026-05-01')
  })

  it('매수 카드 → buy 뱃지', () => {
    const { container } = renderTx({ transactions: [mockTxs[0]] })
    const badge = container.querySelector('.tx-mobile-list .tx-card-badge.buy')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('매수')
  })

  it('매도 카드 → sell 뱃지', () => {
    const { container } = renderTx({ transactions: [mockTxs[1]] })
    const badge = container.querySelector('.tx-mobile-list .tx-card-badge.sell')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('매도')
  })

  it('카드 ✎ 버튼 클릭 시 TransactionEditModal 표시', () => {
    const { container } = renderTx({ transactions: [mockTxs[0]] })
    const editBtn = container.querySelector('.tx-mobile-list .edit')
    fireEvent.click(editBtn)
    expect(screen.getByText(/AAPL 거래 수정/)).toBeInTheDocument()
  })
})
