import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import EditModal from '../../components/EditModal.jsx'

const holding = { t: 'AAPL', nm: 'Apple Inc', q: 10, b: 150, c: 180, currency: 'USD' }

function renderModal(overrides = {}) {
  const props = { holding, onSave: vi.fn(), onClose: vi.fn(), ...overrides }
  return { ...render(<I18nextProvider i18n={i18n}><EditModal {...props} /></I18nextProvider>), ...props }
}

describe('EditModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders holding ticker in title', () => {
    renderModal()
    expect(screen.getByText(/AAPL/)).toBeTruthy()
  })

  it('calls onSave with updated name only', () => {
    const onSave = vi.fn()
    renderModal({ onSave })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Apple Inc Updated' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple Inc Updated', tw: null })
  })

  it('trims whitespace from name before saving', () => {
    const onSave = vi.fn()
    renderModal({ onSave })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Apple  ' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple', tw: null })
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByText('취소'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on overlay click', () => {
    const onClose = vi.fn()
    const { container } = renderModal({ onClose })
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('EditModal 목표 비중 필드', () => {
  it('renders target weight input', () => {
    renderModal({ targetWeight: 30, otherWeightsTotal: 60 })
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('shows remaining weight hint when total <= 100', () => {
    renderModal({ targetWeight: 30, otherWeightsTotal: 50 })
    expect(screen.getByText(/남음/)).toBeTruthy()
  })

  it('shows exceeds warning when total > 100', () => {
    renderModal({ targetWeight: 80, otherWeightsTotal: 60 })
    expect(screen.getByText(/초과/)).toBeTruthy()
  })

  it('saves tw value with onSave', () => {
    const onSave = vi.fn()
    renderModal({ onSave, targetWeight: '', otherWeightsTotal: 0 })
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '40' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tw: 40 }))
  })
})

describe('EditModal 현금 모드', () => {
  function renderCashModal(overrides = {}) {
    const props = {
      holding: { t: 'CASH', nm: '현금' },
      onSave: vi.fn(),
      onClose: vi.fn(),
      cashMode: true,
      cashAmount: 500000,
      targetWeight: 20,
      otherWeightsTotal: 70,
      ...overrides,
    }
    return { ...render(<I18nextProvider i18n={i18n}><EditModal {...props} /></I18nextProvider>), ...props }
  }

  it('renders cash balance input in cash mode', () => {
    renderCashModal()
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.some(i => i.value === '500000')).toBeTruthy()
  })

  it('calls onSave with cashAmount and tw in cash mode', () => {
    const onSave = vi.fn()
    renderCashModal({ onSave })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ cashAmount: 500000, tw: 20 })
  })
})
