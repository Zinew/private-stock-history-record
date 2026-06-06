let _cache = null
let _cacheTime = 0
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export async function fetchEarningsCalendar(apiKey = import.meta.env.VITE_ALPHAVANTAGE_KEY ?? '') {
  if (!apiKey) return []
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) return _cache
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${apiKey}`
    )
    const csv = await res.text()
    const lines = csv.trim().split('\n')
    // rate limit 응답은 두 번째 줄이 'I,n,f,...' 형태
    if (lines.length < 2 || lines[1].startsWith('I,n,f')) return _cache ?? []
    const result = lines.slice(1)
      .map(line => {
        const parts = line.split(',')
        return {
          symbol: parts[0]?.trim(),
          reportDate: parts[2]?.trim(),
          estimate: parts[4] ? parseFloat(parts[4]) : null,
        }
      })
      .filter(e => e.symbol && e.reportDate)
    _cache = result
    _cacheTime = Date.now()
    return result
  } catch {
    return _cache ?? []
  }
}
