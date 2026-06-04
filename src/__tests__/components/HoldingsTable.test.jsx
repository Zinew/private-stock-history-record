import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HoldingsTable from '../../components/HoldingsTable.jsx'

const mockHoldings = [
  { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190, currency: 'USD' },
]
const identity = (n) => n  // toDisplay mock: no conversion

describe('HoldingsTable', () => {
  it('종목 없을 때 빈 안내 메시지 표시', () => {
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={vi.fn()} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    expect(screen.getByText(/종목이 없습니다/)).toBeInTheDocument()
  })

  it('종목 티커 표시', () => {
    render(<HoldingsTable holdings={mockHoldings} totalVal={1900} onAdd={vi.fn()} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 onDelete 호출', () => {
    const onDelete = vi.fn()
    render(<HoldingsTable holdings={mockHoldings} totalVal={1900} onAdd={vi.fn()} onDelete={onDelete} displayCurrency="USD" toDisplay={identity} />)
    fireEvent.click(screen.getByTitle('삭제'))
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('폼 입력 후 추가 버튼 클릭 시 onAdd에 currency 포함', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={onAdd} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: 'TSLA' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '200' } })
    fireEvent.change(screen.getByPlaceholderText('190'), { target: { value: '250' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: 'TSLA', nm: '', q: 5, b: 200, c: 250, currency: 'USD' })
  })

  it('폼 통화 KRW 선택 후 추가 시 currency: KRW', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable holdings={[]} totalVal={0} onAdd={onAdd} onDelete={vi.fn()} displayCurrency="USD" toDisplay={identity} />)
    fireEvent.click(screen.getByText('KRW'))
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: '005930' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '10' } })
    fireEvent.change(screen.getByPlaceholderText('75000'), { target: { value: '75000' } })
    fireEvent.change(screen.getByPlaceholderText('82000'), { target: { value: '82000' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: '005930', nm: '', q: 10, b: 75000, c: 82000, currency: 'KRW' })
  })
})
