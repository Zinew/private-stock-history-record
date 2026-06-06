import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchQuote, fetchEarnings, fetchDividends, _clearDivCache,
  fetchCompanyNews, formatPublishedAt, _clearNewsCache,
} from '../utils/finnhub.js'

beforeEach(() => { _clearDivCache(); _clearNewsCache() })
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

describe('formatPublishedAt', () => {
  it('returns "N시간 전" for timestamps within 24 hours', () => {
    const twoHoursAgo = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000)
    expect(formatPublishedAt(twoHoursAgo)).toBe('2시간 전')
  })

  it('returns "YYYY-MM-DD" for timestamps older than 24 hours', () => {
    const ts = Math.floor(new Date('2026-06-01T10:00:00Z').getTime() / 1000)
    expect(formatPublishedAt(ts)).toBe('2026-06-01')
  })
})

describe('fetchCompanyNews', () => {
  it('maps Finnhub response to article shape and slices to 10', async () => {
    const fakeItems = Array.from({ length: 12 }, (_, i) => ({
      headline: `Title ${i}`,
      summary: `Summary ${i}`,
      source: 'Reuters',
      url: `https://example.com/${i}`,
      datetime: Math.floor((Date.now() - i * 60 * 60 * 1000) / 1000),
    }))
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(fakeItems),
    })
    const result = await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06', 'test-key')
    expect(result).toHaveLength(10)
    expect(result[0]).toMatchObject({ title: 'Title 0', source: 'Reuters', url: 'https://example.com/0' })
    expect(typeof result[0].publishedAt).toBe('string')
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'not found' }),
    })
    expect(await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06', 'test-key')).toEqual([])
  })

  it('returns empty array when apiKey is empty string', async () => {
    expect(await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06', '')).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06', 'test-key')).toEqual([])
  })

  it('returns cached data on network error when cache exists', async () => {
    const oldTimestamp = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000)
    const fakeItems = [{ headline: 'Old news', summary: null, source: 'Reuters', url: 'https://example.com/0', datetime: oldTimestamp }]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ json: () => Promise.resolve(fakeItems) })
    await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06', 'test-key')
    vi.useFakeTimers()
    vi.advanceTimersByTime(61 * 60 * 1000)
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    const result = await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06', 'test-key')
    vi.useRealTimers()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Old news')
  })
})
