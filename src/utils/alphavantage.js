let _cache = null
let _cacheTime = 0
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export function _clearEarningsCache() { _cache = null; _cacheTime = 0 }

export async function fetchEarningsCalendar() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) return _cache
  try {
    const res = await fetch('/api/earnings-calendar')
    const data = await res.json()
    if (!Array.isArray(data)) return _cache ?? []
    _cache = data
    _cacheTime = Date.now()
    return data
  } catch {
    return _cache ?? []
  }
}
