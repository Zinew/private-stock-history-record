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

export async function fetchDividends(ticker, from, to, apiKey = import.meta.env.VITE_FINNHUB_KEY ?? '') {
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/dividend?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`
    )
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
