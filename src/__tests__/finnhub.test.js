import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import {
  fetchQuote, fetchEarnings, fetchDividends, _clearDivCache,
  fetchCompanyNews, formatPublishedAt, _clearNewsCache,
} from '../utils/finnhub.js'
import i18n from '../i18n.js'

beforeAll(async () => { await i18n.changeLanguage('ko') })
beforeEach(() => { _clearDivCache(); _clearNewsCache() })
afterEach(() => vi.restoreAllMocks())

describe('fetchQuote', () => {
  it('returns price when CF endpoint succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ price: 195.5 }),
    })
    expect(await fetchQuote('AAPL')).toBe(195.5)
    expect(fetch).toHaveBeenCalledWith('/api/finnhub-quote?symbol=AAPL')
  })

  it('returns null when price is null', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ price: null }),
    })
    expect(await fetchQuote('INVALID')).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchQuote('AAPL')).toBeNull()
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
  it('maps CF response to article shape and slices to 10', async () => {
    const fakeItems = Array.from({ length: 12 }, (_, i) => ({
      title: `Title ${i}`,
      summary: `Summary ${i}`,
      source: 'Reuters',
      url: `https://example.com/${i}`,
      publishedAtUnix: Math.floor((Date.now() - i * 60 * 60 * 1000) / 1000),
    }))
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(fakeItems),
    })
    const result = await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')
    expect(result).toHaveLength(10)
    expect(result[0]).toMatchObject({ title: 'Title 0', source: 'Reuters', url: 'https://example.com/0' })
    expect(typeof result[0].publishedAt).toBe('string')
    expect(fetch).toHaveBeenCalledWith(
      '/api/company-news?symbol=AAPL&from=2026-05-07&to=2026-06-06'
    )
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'not found' }),
    })
    expect(await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')).toEqual([])
  })

  it('returns cached data on network error when cache exists', async () => {
    const oldUnix = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000)
    const fakeItems = [{ title: 'Old news', summary: null, source: 'Reuters', url: 'https://example.com/0', publishedAtUnix: oldUnix }]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ json: () => Promise.resolve(fakeItems) })
    await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')
    vi.useFakeTimers()
    let result
    try {
      vi.advanceTimersByTime(61 * 60 * 1000)
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
      result = await fetchCompanyNews('AAPL', '2026-05-07', '2026-06-06')
    } finally {
      vi.useRealTimers()
    }
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Old news')
  })
})
