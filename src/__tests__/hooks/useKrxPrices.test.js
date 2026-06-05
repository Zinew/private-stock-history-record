import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useKrxPrices } from '../../hooks/useKrxPrices.js'
import { fetchKrxQuote } from '../../utils/stockSearch.js'

vi.mock('../../utils/stockSearch.js', () => ({
  fetchKrxQuote: vi.fn(),
  fetchKrxSearch: vi.fn(),
  fetchUsdSearch: vi.fn(),
}))

describe('useKrxPrices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('빈 목록 → fetchKrxQuote 미호출', async () => {
    const { result } = renderHook(() => useKrxPrices([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchKrxQuote).not.toHaveBeenCalled()
    expect(result.current.prices).toEqual({})
  })

  it('KRW 종목 조회 → prices 맵 반환', async () => {
    fetchKrxQuote.mockResolvedValueOnce(329000)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices['005930']).toBe(329000)
    expect(fetchKrxQuote).toHaveBeenCalledWith('005930', 'KS')
  })

  it('전체 조회 실패 시 error 설정', async () => {
    fetchKrxQuote.mockResolvedValueOnce(null)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })

  it('성공 시 lastUpdatedAt은 Date 인스턴스', async () => {
    fetchKrxQuote.mockResolvedValueOnce(329000)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date)
  })

  it('refresh 호출 시 재조회', async () => {
    fetchKrxQuote.mockResolvedValue(329000)
    const { result } = renderHook(() => useKrxPrices([{ t: '005930', exchange: 'KS' }]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    fetchKrxQuote.mockResolvedValue(335000)
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices['005930']).toBe(335000)
  })

  it('일부 종목 실패 시 성공한 종목 가격은 반환되고 error 없음', async () => {
    fetchKrxQuote
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(329000)
    const { result } = renderHook(() =>
      useKrxPrices([{ t: '000000', exchange: 'KS' }, { t: '005930', exchange: 'KS' }])
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.prices['005930']).toBe(329000)
    expect(result.current.prices['000000']).toBeUndefined()
  })
})
