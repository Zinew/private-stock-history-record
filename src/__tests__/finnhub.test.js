import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchQuote } from '../utils/finnhub.js'

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
