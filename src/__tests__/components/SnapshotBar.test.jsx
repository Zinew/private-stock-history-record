import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SnapshotBar from '../../components/SnapshotBar.jsx'

describe('SnapshotBar', () => {
  it('두 버튼 렌더링', () => {
    render(<SnapshotBar onSnapshot={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText(/오늘 자산 기록하기/)).toBeInTheDocument()
    expect(screen.getByText('추이 초기화')).toBeInTheDocument()
  })

  it('기록 버튼 클릭 시 onSnapshot 호출', () => {
    const onSnapshot = vi.fn()
    render(<SnapshotBar onSnapshot={onSnapshot} onClear={vi.fn()} />)
    fireEvent.click(screen.getByText(/오늘 자산 기록하기/))
    expect(onSnapshot).toHaveBeenCalledOnce()
  })

  it('초기화 버튼 클릭 시 onClear 호출', () => {
    const onClear = vi.fn()
    render(<SnapshotBar onSnapshot={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByText('추이 초기화'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
