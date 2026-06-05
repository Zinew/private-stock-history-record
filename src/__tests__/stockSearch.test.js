import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../utils/stockSearch.js'

describe('fetchUsdSearch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('빈 문자열 → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchUsdSearch('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('null → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchUsdSearch(null)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('정상 응답 → 결과 배열 반환', async () => {
    const mockResults = [{ symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    }))
    const result = await fetchUsdSearch('apple')
    expect(result).toEqual(mockResults)
    expect(fetch).toHaveBeenCalledWith('/api/usd-search?q=apple')
  })

  it('fetch 실패 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await fetchUsdSearch('apple')).toEqual([])
  })

  it('응답 not ok 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchUsdSearch('apple')).toEqual([])
  })
})

describe('fetchKrxSearch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('빈 문자열 → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchKrxSearch('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('null → 빈 배열 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchKrxSearch(null)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('정상 응답 → 결과 배열 반환', async () => {
    const mockResults = [{ symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    }))
    const result = await fetchKrxSearch('삼성')
    expect(result).toEqual(mockResults)
    expect(fetch).toHaveBeenCalledWith('/api/krx-search?q=%EC%82%BC%EC%84%B1')
  })

  it('fetch 실패 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await fetchKrxSearch('삼성')).toEqual([])
  })

  it('응답 not ok 시 빈 배열 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchKrxSearch('삼성')).toEqual([])
  })
})

describe('fetchKrxQuote', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('빈 ticker → null 반환 (fetch 미호출)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect(await fetchKrxQuote('', 'KS')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('정상 응답 → price 반환, symbol 포맷 확인', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ price: 329000 }),
    }))
    expect(await fetchKrxQuote('005930', 'KS')).toBe(329000)
    expect(fetch).toHaveBeenCalledWith('/api/krx-quote?symbol=005930.KS')
  })

  it('price null 응답 → null 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ price: null }),
    }))
    expect(await fetchKrxQuote('005930', 'KS')).toBeNull()
  })

  it('fetch 실패 시 null 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await fetchKrxQuote('005930', 'KS')).toBeNull()
  })

  it('응답 not ok → null 반환', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchKrxQuote('005930', 'KS')).toBeNull()
  })
})
