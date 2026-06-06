// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchNaverNews, _clearNaverCache } from '../utils/naverNews.js'

beforeEach(() => _clearNaverCache())
afterEach(() => vi.restoreAllMocks())

describe('fetchNaverNews', () => {
  it('returns article array when proxy responds successfully', async () => {
    const fakeArticles = [
      { title: '삼성전자 실적 발표', summary: null, source: '한국경제', url: 'https://finance.naver.com/...', publishedAt: '2026.06.06 10:00' },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve(fakeArticles),
    })
    const result = await fetchNaverNews('005930')
    expect(result).toEqual(fakeArticles)
  })

  it('returns null when proxy returns error object', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'no articles parsed' }),
    })
    expect(await fetchNaverNews('005930')).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await fetchNaverNews('005930')).toBeNull()
  })
})
