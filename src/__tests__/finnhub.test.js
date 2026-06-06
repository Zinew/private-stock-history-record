import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchQuote, fetchEarnings, fetchDividends, _clearDivCache } from '../utils/finnhub.js'

beforeEach(() => _clearDivCache())
afterEach(() => vi.restoreAllMocks())

describe('fetchQuote', () => {
  it('returns current price when API succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ c: 195.5 }),
    })
    expect(await fetchQuote('AAPL', 'test-key')).toBe(195.5)
  })

  it('returns null when c is 0 (unrecognized ticker or pre-market)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ c: 0 }),
    })
    expect(await fetchQuote('INVALID', 'test-key')).toBeNull()
  })

  it('returns null when fetch throws (network error)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'))
    expect(await fetchQuote('AAPL', 'test-key')).toBeNull()
  })

  it('returns null when apiKey is empty string', async () => {
    expect(await fetchQuote('AAPL', '')).toBeNull()
  })
})

describe('fetchEarnings', () => {
  it('returns earningsCalendar array when API succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ earningsCalendar: [{ date: '2026-06-10', epsEstimate: 1.58, symbol: 'AAPL' }] }),
    })
    const result = await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', 'test-key')
    expect(result).toEqual([{ date: '2026-06-10', epsEstimate: 1.58, symbol: 'AAPL' }])
  })

  it('returns empty array when earningsCalendar is missing from response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    })
    expect(await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when apiKey is empty string', async () => {
    expect(await fetchEarnings('AAPL', '2026-06-06', '2026-09-04', '')).toEqual([])
  })
})

describe('fetchDividends', () => {
  it('returns dividend array when API succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve([{ exDividendDate: '2026-06-15', amount: 0.75, symbol: 'MSFT' }]),
    })
    const result = await fetchDividends('MSFT', '2026-06-06', '2026-09-04', 'test-key')
    expect(result).toEqual([{ exDividendDate: '2026-06-15', amount: 0.75, symbol: 'MSFT' }])
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'not found' }),
    })
    expect(await fetchDividends('MSFT', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchDividends('MSFT', '2026-06-06', '2026-09-04', 'test-key')).toEqual([])
  })

  it('returns empty array when apiKey is empty string', async () => {
    expect(await fetchDividends('MSFT', '2026-06-06', '2026-09-04', '')).toEqual([])
  })
})
