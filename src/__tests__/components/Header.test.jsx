import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../../components/Header.jsx'

const defaultProps = {
  totalVal: 0,
  totalCost: 0,
  pl: 0,
  ret: 0,
  displayCurrency: 'USD',
  onToggleCurrency: vi.fn(),
  exchangeRate: { rate: null, updatedAt: null },
  onMenuOpen: vi.fn(),
}

describe('Header', () => {
  it('브랜드 이름 Ledger 표시', () => {
    render(<Header {...defaultProps} />)
    expect(screen.getByText(/Ledger/)).toBeInTheDocument()
  })

  it('총 평가액 표시 (USD)', () => {
    render(<Header {...defaultProps} totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    expect(screen.getByText('$12,450.00')).toBeInTheDocument()
  })

  it('총 평가액 표시 (KRW)', () => {
    render(<Header {...defaultProps} totalVal={17000000} totalCost={10000000} pl={7000000} ret={70} displayCurrency="KRW" />)
    expect(screen.getByText('₩17,000,000')).toBeInTheDocument()
  })

  it('양수 손익에 pos 클래스 적용', () => {
    render(<Header {...defaultProps} totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    expect(screen.getByText('+$2,450.00')).toHaveClass('pos')
  })

  it('음수 손익에 neg 클래스 적용', () => {
    render(<Header {...defaultProps} totalVal={8000} totalCost={10000} pl={-2000} ret={-20} />)
    expect(screen.getByText('-$2,000.00')).toHaveClass('neg')
  })

  it('환율 있으면 토글 버튼 표시', () => {
    render(<Header {...defaultProps} exchangeRate={{ rate: 1380, updatedAt: new Date().toISOString() }} />)
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('KRW')).toBeInTheDocument()
  })

  it('환율 없으면 토글 버튼 숨김', () => {
    render(<Header {...defaultProps} exchangeRate={{ rate: null, updatedAt: null }} />)
    expect(screen.queryByText('KRW')).not.toBeInTheDocument()
  })

  it('토글 클릭 시 onToggleCurrency 호출', () => {
    const onToggle = vi.fn()
    render(<Header {...defaultProps} exchangeRate={{ rate: 1380, updatedAt: new Date().toISOString() }} onToggleCurrency={onToggle} />)
    fireEvent.click(screen.getByText('KRW'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('☰ 버튼 클릭 시 onMenuOpen 호출', () => {
    const onMenuOpen = vi.fn()
    render(<Header {...defaultProps} onMenuOpen={onMenuOpen} />)
    fireEvent.click(screen.getByLabelText('메뉴 열기'))
    expect(onMenuOpen).toHaveBeenCalledOnce()
  })
})
