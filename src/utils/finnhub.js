export async function fetchQuote(ticker, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) {
    console.warn('[Finnhub] VITE_FINNHUB_KEY not set — price fetch skipped')
    return null
  }
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`
    )
    const data = await res.json()
    return data.c > 0 ? data.c : null
  } catch {
    return null
  }
}

export async function fetchEarnings(ticker, from, to, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/earnings-calendar?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    return data.earningsCalendar ?? []
  } catch {
    return []
  }
}

const _divCache = {}
const DIV_CACHE_TTL = 6 * 60 * 60 * 1000
export function _clearDivCache() { Object.keys(_divCache).forEach(k => delete _divCache[k]) }

export async function fetchDividends(ticker, from, to, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) return []
  const key = `${ticker}:${from}:${to}`
  if (_divCache[key] && Date.now() - _divCache[key].time < DIV_CACHE_TTL) return _divCache[key].data
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/dividend?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    const result = Array.isArray(data) ? data : []
    _divCache[key] = { data: result, time: Date.now() }
    return result
  } catch {
    return _divCache[key]?.data ?? []
  }
}
