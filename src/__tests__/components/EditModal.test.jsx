import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditModal from '../../components/EditModal.jsx'

const usdHolding = { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190, currency: 'USD' }
const krwHolding = { t: '005930', nm: '삼성전자', q: 5, b: 75000, c: 82000, currency: 'KRW' }

describe('EditModal', () => {
  const onSave = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  it('holding 데이터로 폼 초기화', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    expect(screen.getByDisplayValue('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
  })

  it('유효한 입력 저장 시 onSave에 올바른 값 전달', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '20' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple Inc.', q: 20, b: 150, c: 190 })
  })

  it('수량 0 입력 시 alert 표시, onSave 미호출', () => {
    window.alert = vi.fn()
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '0' } })
    fireEvent.click(screen.getByText('저장'))
    expect(window.alert).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('USD 종목: 현재가 input은 readOnly', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    expect(screen.getByDisplayValue('190').readOnly).toBe(true)
  })

  it('KRW 종목: 현재가 input 편집 가능, 저장 시 변경값 전달', () => {
    render(<EditModal holding={krwHolding} onSave={onSave} onClose={onClose} />)
    const curInput = screen.getByDisplayValue('82000')
    expect(curInput.readOnly).toBe(false)
    fireEvent.change(curInput, { target: { value: '85000' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: '삼성전자', q: 5, b: 75000, c: 85000 })
  })

  it('overlay 클릭 → onClose 호출', () => {
    const { container } = render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc 키 → onClose 호출', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
