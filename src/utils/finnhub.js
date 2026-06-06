import i18n from '../i18n.js'

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

export function formatPublishedAt(unixTs) {
  if (!unixTs) return ''
  const diffHours = Math.floor((Date.now() - unixTs * 1000) / (1000 * 60 * 60))
  if (diffHours < 24) return i18n.t('common.hoursAgo', { count: diffHours })
  const d = new Date(unixTs * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const _newsCache = {}
const NEWS_CACHE_TTL = 60 * 60 * 1000
export function _clearNewsCache() { Object.keys(_newsCache).forEach(k => delete _newsCache[k]) }

export async function fetchCompanyNews(ticker, from, to, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) return []
  const key = `${ticker}:${from}:${to}`
  if (_newsCache[key] && Date.now() - _newsCache[key].time < NEWS_CACHE_TTL) return _newsCache[key].data
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    const result = Array.isArray(data)
      ? data.slice(0, 10).map(item => ({
          title: item.headline,
          summary: item.summary || null,
          source: item.source,
          url: item.url,
          publishedAt: formatPublishedAt(item.datetime),
        }))
      : []
    _newsCache[key] = { data: result, time: Date.now() }
    return result
  } catch {
    return _newsCache[key]?.data ?? []
  }
}
