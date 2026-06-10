import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePortfolio } from '../hooks/usePortfolio.js'

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  })
})
afterEach(() => vi.restoreAllMocks())

describe('deleteSnap', () => {
  it('removes snapshot at the given index, others unchanged', () => {
    localStorage.setItem('ledger_snaps', JSON.stringify([
      { label: '6/7 10:00', total: 10000, currency: 'USD' },
      { label: '6/7 12:00', total: 11000, currency: 'USD' },
      { label: '6/7 14:00', total: 12000, currency: 'USD' },
    ]))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.deleteSnap(1) })
    expect(result.current.snaps).toHaveLength(2)
    expect(result.current.snaps[0].label).toBe('6/7 10:00')
    expect(result.current.snaps[1].label).toBe('6/7 14:00')
  })

  it('persists deletion to localStorage', () => {
    localStorage.setItem('ledger_snaps', JSON.stringify([
      { label: '6/7 10:00', total: 10000, currency: 'USD' },
      { label: '6/7 12:00', total: 11000, currency: 'USD' },
    ]))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.deleteSnap(0) })
    const stored = JSON.parse(localStorage.getItem('ledger_snaps'))
    expect(stored).toHaveLength(1)
    expect(stored[0].label).toBe('6/7 12:00')
  })
})

describe('restoreSnap', () => {
  it('inserts snapshot back at the original index', () => {
    localStorage.setItem('ledger_snaps', JSON.stringify([
      { label: '6/7 10:00', total: 10000, currency: 'USD' },
      { label: '6/7 14:00', total: 12000, currency: 'USD' },
    ]))
    const snap = { label: '6/7 12:00', total: 11000, currency: 'USD' }
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.restoreSnap(snap, 1) })
    expect(result.current.snaps).toHaveLength(3)
    expect(result.current.snaps[0].label).toBe('6/7 10:00')
    expect(result.current.snaps[1].label).toBe('6/7 12:00')
    expect(result.current.snaps[2].label).toBe('6/7 14:00')
  })
})

describe('cash', () => {
  it('initializes cash to 0', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.cash).toBe(0)
  })

  it('setCash updates cash value', () => {
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setCash(500000) })
    expect(result.current.cash).toBe(500000)
  })

  it('cash is included in totalVal', () => {
    localStorage.setItem('ledger_cash', '1000')
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.totalVal).toBe(1000)
  })
})

describe('targetWeights', () => {
  it('initializes targetWeights to empty object', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.targetWeights).toEqual({})
  })

  it('setTargetWeight stores weight for ticker', () => {
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setTargetWeight('AAPL', 40) })
    expect(result.current.targetWeights['AAPL']).toBe(40)
  })

  it('setTargetWeight with null removes ticker', () => {
    localStorage.setItem('ledger_target_weights', JSON.stringify({ AAPL: 40 }))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setTargetWeight('AAPL', null) })
    expect(result.current.targetWeights['AAPL']).toBeUndefined()
  })

  it('setTargetWeight preserves other tickers', () => {
    localStorage.setItem('ledger_target_weights', JSON.stringify({ AAPL: 40, SCHD: 20 }))
    const { result } = renderHook(() => usePortfolio())
    act(() => { result.current.setTargetWeight('AAPL', 35) })
    expect(result.current.targetWeights['SCHD']).toBe(20)
    expect(result.current.targetWeights['AAPL']).toBe(35)
  })
})
