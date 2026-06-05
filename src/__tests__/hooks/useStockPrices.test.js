import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useStockPrices } from '../../hooks/useStockPrices.js'
import { fetchQuote } from '../../utils/finnhub.js'

vi.mock('../../utils/finnhub.js', () => ({ fetchQuote: vi.fn() }))

describe('useStockPrices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches prices for all USD tickers on mount', async () => {
    fetchQuote.mockImplementation(t => Promise.resolve(t === 'AAPL' ? 195.5 : 875.2))
    const { result } = renderHook(() => useStockPrices(['AAPL', 'NVDA']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices).toEqual({ AAPL: 195.5, NVDA: 875.2 })
  })

  it('sets error when all fetches return null', async () => {
    fetchQuote.mockResolvedValue(null)
    const { result } = renderHook(() => useStockPrices(['AAPL']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })

  it('does not call fetchQuote when tickers is empty', async () => {
    const { result } = renderHook(() => useStockPrices([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchQuote).not.toHaveBeenCalled()
    expect(result.current.prices).toEqual({})
  })

  it('refresh re-fetches with updated prices', async () => {
    fetchQuote.mockResolvedValue(195.5)
    const { result } = renderHook(() => useStockPrices(['AAPL']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    fetchQuote.mockResolvedValue(200.0)
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prices.AAPL).toBe(200.0)
  })

  it('sets lastUpdatedAt after successful fetch', async () => {
    fetchQuote.mockResolvedValue(195.5)
    const { result } = renderHook(() => useStockPrices(['AAPL']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date)
  })
})
