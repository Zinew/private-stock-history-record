const _naverCache = {}
const NAVER_CACHE_TTL = 60 * 60 * 1000
export function _clearNaverCache() { Object.keys(_naverCache).forEach(k => delete _naverCache[k]) }

export async function fetchNaverNews(code) {
  if (_naverCache[code] && Date.now() - _naverCache[code].time < NAVER_CACHE_TTL) {
    return _naverCache[code].data
  }
  try {
    const res = await fetch(`/api/naver-news?code=${encodeURIComponent(code)}`)
    const data = await res.json()
    if (!Array.isArray(data)) return null
    _naverCache[code] = { data, time: Date.now() }
    return data
  } catch {
    return null
  }
}
