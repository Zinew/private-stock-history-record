import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// 가격 훅 2개를 제어 가능한 mock으로 교체 — 필드를 바꾸고 rerender하면 로딩 전환 시뮬레이션 가능.
// 리팩토링 후 usePortfolio가 useLivePrices를 경유해도 동일 모듈을 가로채므로 이 테스트는 무수정 유지된다.
const { mockUsd, mockKrw } = vi.hoisted(() => ({
  mockUsd: { prices: {}, loading: false, error: null, lastUpdatedAt: null, refresh: () => {} },
  mockKrw: { prices: {}, loading: false, error: null, lastUpdatedAt: null, refresh: () => {} },
}))

vi.mock('../hooks/useStockPrices.js', () => ({ useStockPrices: () => ({ ...mockUsd }) }))
vi.mock('../hooks/useKrxPrices.js', () => ({ useKrxPrices: () => ({ ...mockKrw }) }))

import { usePortfolio } from '../hooks/usePortfolio.js'

const BUY_AAPL = { id: 't1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2026-01-02', qty: 1, price: 100 }

function resetMocks() {
  mockUsd.prices = {}
  mockUsd.loading = false
  mockUsd.error = null
  mockKrw.prices = {}
  mockKrw.loading = false
  mockKrw.error = null
}

beforeEach(() => {
  localStorage.clear()
  resetMocks()
})

describe('usePortfolio — 자동 스냅샷 기록 (특성화)', () => {
  it('가격 로딩이 끝나는 순간 오늘 스냅샷을 기록한다', () => {
    localStorage.setItem('ledger_transactions', JSON.stringify([BUY_AAPL]))
    mockUsd.loading = true
    const { result, rerender } = renderHook(() => usePortfolio())
    expect(result.current.snaps).toEqual([])

    mockUsd.loading = false
    mockUsd.prices = { AAPL: 150 }
    rerender()

    expect(result.current.snaps).toHaveLength(1)
    expect(result.current.snaps[0].total).toBe(150) // 1주 × 현재가 150, 현금 0
    expect(result.current.snaps[0].date).toBe(new Date().toISOString().slice(0, 10))
    expect(result.current.snaps[0].currency).toBe('USD')
  })

  it('같은 날 다시 기록하면 추가가 아니라 갱신한다 (upsert)', () => {
    localStorage.setItem('ledger_transactions', JSON.stringify([BUY_AAPL]))
    mockUsd.loading = true
    const { result, rerender } = renderHook(() => usePortfolio())

    mockUsd.loading = false
    mockUsd.prices = { AAPL: 150 }
    rerender()
    expect(result.current.snaps).toHaveLength(1)
    expect(result.current.snaps[0].total).toBe(150)

    // 두 번째 로딩 사이클 (새로고침 시나리오)
    mockUsd.loading = true
    rerender()
    mockUsd.loading = false
    mockUsd.prices = { AAPL: 200 }
    rerender()

    expect(result.current.snaps).toHaveLength(1) // 여전히 1개
    expect(result.current.snaps[0].total).toBe(200) // total만 갱신
  })

  it('거래 추가 직후에도 스냅샷을 기록한다 (로딩 전환 없이)', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.snaps).toEqual([])

    act(() => {
      result.current.addTransaction({ type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2026-01-02', qty: 2, price: 100 })
    })

    expect(result.current.snaps).toHaveLength(1)
    expect(result.current.snaps[0].total).toBe(200) // 2주 × 매수가 폴백 100 (실시간 가격 없음)
  })

  it('보유 종목이 없으면 기록하지 않는다', () => {
    mockUsd.loading = true
    const { result, rerender } = renderHook(() => usePortfolio())

    mockUsd.loading = false
    rerender()

    expect(result.current.snaps).toEqual([])
  })
})
