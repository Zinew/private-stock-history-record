import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import SnapshotBar from '../../components/SnapshotBar.jsx'

function renderSnapshotBar(props) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SnapshotBar {...props} />
    </I18nextProvider>
  )
}

describe('SnapshotBar', () => {
  it('두 버튼 렌더링', () => {
    renderSnapshotBar({ onSnapshot: vi.fn(), onClear: vi.fn() })
    expect(screen.getByText(/오늘 자산 기록하기/)).toBeInTheDocument()
    expect(screen.getByText('추이 초기화')).toBeInTheDocument()
  })

  it('기록 버튼 클릭 시 onSnapshot 호출', () => {
    const onSnapshot = vi.fn()
    renderSnapshotBar({ onSnapshot, onClear: vi.fn() })
    fireEvent.click(screen.getByText(/오늘 자산 기록하기/))
    expect(onSnapshot).toHaveBeenCalledOnce()
  })

  it('초기화 버튼 클릭 시 onClear 호출', () => {
    const onClear = vi.fn()
    renderSnapshotBar({ onSnapshot: vi.fn(), onClear })
    fireEvent.click(screen.getByText('추이 초기화'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
