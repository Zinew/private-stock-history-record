import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from '../../components/Header.jsx'

describe('Header', () => {
  it('브랜드 이름 Ledger 표시', () => {
    render(<Header totalVal={0} totalCost={0} pl={0} ret={0} />)
    expect(screen.getByText(/Ledger/)).toBeInTheDocument()
  })

  it('총 평가액 표시', () => {
    render(<Header totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    expect(screen.getByText('$12,450.00')).toBeInTheDocument()
  })

  it('양수 손익에 pos 클래스 적용', () => {
    render(<Header totalVal={12450} totalCost={10000} pl={2450} ret={24.5} />)
    const plEl = screen.getByText('+$2,450.00')
    expect(plEl).toHaveClass('pos')
  })

  it('음수 손익에 neg 클래스 적용', () => {
    render(<Header totalVal={8000} totalCost={10000} pl={-2000} ret={-20} />)
    const plEl = screen.getByText('-$2,000.00')
    expect(plEl).toHaveClass('neg')
  })
})
