// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchEarningsCalendar, _clearEarningsCache } from '../utils/alphavantage.js'

beforeEach(() => _clearEarningsCache())
afterEach(() => vi.restoreAllMocks())

describe('fetchEarningsCalendar', () => {
  it('calls /api/earnings-calendar and returns parsed array', async () => {
    const fakeData = [{ symbol: 'AAPL', reportDate: '2026-07-30', estimate: 1.9 }]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(fakeData),
    })
    const result = await fetchEarningsCalendar()
    expect(result).toEqual(fakeData)
    expect(fetch).toHaveBeenCalledWith('/api/earnings-calendar')
  })

  it('returns cached result on second call without extra fetch', async () => {
    const fakeData = [{ symbol: 'AAPL', reportDate: '2026-07-30', estimate: 1.9 }]
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(fakeData),
    })
    await fetchEarningsCalendar()
    await fetchEarningsCalendar()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'rate limited' }),
    })
    expect(await fetchEarningsCalendar()).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchEarningsCalendar()).toEqual([])
  })
})
