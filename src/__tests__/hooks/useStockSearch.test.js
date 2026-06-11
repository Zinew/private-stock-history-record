import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStockSearch } from '../../hooks/useStockSearch.js'
import { fetchUsdSearch, fetchKrxSearch } from '../../utils/stockSearch.js'

vi.mock('../../utils/stockSearch.js', () => ({
  fetchUsdSearch: vi.fn(),
  fetchKrxSearch: vi.fn(),
}))

beforeEach(() => {
  vi.useFakeTimers()
  fetchUsdSearch.mockReset()
  fetchKrxSearch.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useStockSearch', () => {
  it('빈 쿼리는 결과를 비우고 API를 호출하지 않는다', async () => {
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('   ') })
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(result.current.results).toEqual([])
    expect(result.current.open).toBe(false)
    expect(fetchKrxSearch).not.toHaveBeenCalled()
    expect(fetchUsdSearch).not.toHaveBeenCalled()
  })

  it('연속 호출 시 마지막 쿼리만 디바운스 후 1회 검색한다', async () => {
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockResolvedValue([{ symbol: 'AAPL', ticker: 'AAPL', name: 'Apple' }])
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('a') })
    act(() => { vi.advanceTimersByTime(100) })
    act(() => { result.current.search('aa') })
    act(() => { vi.advanceTimersByTime(100) })
    act(() => { result.current.search('aap') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(fetchKrxSearch).toHaveBeenCalledTimes(1)
    expect(fetchKrxSearch).toHaveBeenCalledWith('aap')
    expect(fetchUsdSearch).toHaveBeenCalledTimes(1)
    expect(fetchUsdSearch).toHaveBeenCalledWith('aap')
  })

  it('KRX 먼저 + market 매핑 + 8개 제한으로 병합한다', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', ticker: '005930', name: '삼성전자', exchange: 'KS' },
      { symbol: '035720.KQ', ticker: '035720', name: '카카오', exchange: 'KQ' },
    ])
    fetchUsdSearch.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({ symbol: `T${i}`, ticker: `T${i}`, name: `Stock ${i}` }))
    )
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('삼성') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(result.current.results).toHaveLength(8)
    expect(result.current.results[0]).toMatchObject({ ticker: '005930', market: 'KOSPI' })
    expect(result.current.results[1]).toMatchObject({ ticker: '035720', market: 'KOSDAQ' })
    expect(result.current.results[2]).toMatchObject({ ticker: 'T0', market: 'US' })
    expect(result.current.open).toBe(true)
  })

  it('결과가 없으면 드롭다운을 열지 않는다', async () => {
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockResolvedValue([])
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('zzzz') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(result.current.results).toEqual([])
    expect(result.current.open).toBe(false)
  })

  it('clear()는 대기 중인 검색을 취소한다', async () => {
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockResolvedValue([])
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('aapl') })
    act(() => { result.current.clear() })
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(fetchKrxSearch).not.toHaveBeenCalled()
    expect(fetchUsdSearch).not.toHaveBeenCalled()
    expect(result.current.open).toBe(false)
  })

  it('느린 응답이 clear() 이후 도착해도 결과를 반영하지 않는다', async () => {
    let resolveUsd
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockReturnValue(new Promise(resolve => { resolveUsd = resolve }))
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('aapl') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    act(() => { result.current.clear() })
    await act(async () => { resolveUsd([{ symbol: 'AAPL', ticker: 'AAPL', name: 'Apple' }]) })
    expect(result.current.results).toEqual([])
    expect(result.current.open).toBe(false)
  })

  it('close()는 드롭다운만 닫고 결과는 유지한다', async () => {
    fetchKrxSearch.mockResolvedValue([])
    fetchUsdSearch.mockResolvedValue([{ symbol: 'AAPL', ticker: 'AAPL', name: 'Apple' }])
    const { result } = renderHook(() => useStockSearch())
    act(() => { result.current.search('aapl') })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(result.current.open).toBe(true)
    act(() => { result.current.close() })
    expect(result.current.open).toBe(false)
    expect(result.current.results).toHaveLength(1)
  })
})
