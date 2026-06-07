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
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple Inc Updated' })
  })

  it('trims whitespace from name before saving', () => {
    const onSave = vi.fn()
    renderModal({ onSave })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Apple  ' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple' })
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
