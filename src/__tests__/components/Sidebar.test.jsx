import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../../components/Sidebar.jsx'

function renderSidebar(props, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar {...props} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('isOpen=false 시 .open 클래스 없음', () => {
    const { container } = renderSidebar({ isOpen: false, onClose: vi.fn() })
    expect(container.querySelector('.sidebar')).not.toHaveClass('open')
  })

  it('isOpen=true 시 .open 클래스 있음', () => {
    const { container } = renderSidebar({ isOpen: true, onClose: vi.fn() })
    expect(container.querySelector('.sidebar')).toHaveClass('open')
  })

  it('오버레이 클릭 시 onClose 호출', () => {
    const onClose = vi.fn()
    const { container } = renderSidebar({ isOpen: true, onClose })
    fireEvent.click(container.querySelector('.sidebar-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('✕ 버튼 클릭 시 onClose 호출', () => {
    const onClose = vi.fn()
    renderSidebar({ isOpen: true, onClose })
    fireEvent.click(screen.getByLabelText('메뉴 닫기'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('세 개 메뉴 항목 렌더링', () => {
    renderSidebar({ isOpen: false, onClose: vi.fn() })
    expect(screen.getByText('대시보드')).toBeInTheDocument()
    expect(screen.getByText('캘린더')).toBeInTheDocument()
    expect(screen.getByText('뉴스')).toBeInTheDocument()
  })

  it('경로 / 에서 대시보드 항목 active 클래스', () => {
    renderSidebar({ isOpen: false, onClose: vi.fn() }, '/')
    expect(screen.getByText('대시보드').closest('.nav-item')).toHaveClass('active')
  })

  it('경로 /calendar 에서 캘린더 항목 active 클래스', () => {
    renderSidebar({ isOpen: false, onClose: vi.fn() }, '/calendar')
    expect(screen.getByText('캘린더').closest('.nav-item')).toHaveClass('active')
  })
})
