export async function fetchUsdSearch(query) {
  if (!query?.trim()) return []
  try {
    const res = await fetch(`/api/usd-search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function fetchKrxSearch(query) {
  if (!query?.trim()) return []
  try {
    const res = await fetch(`/api/krx-search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function fetchKrxQuote(ticker, exchange) {
  if (!ticker?.trim() || !exchange?.trim()) return null
  try {
    const res = await fetch(`/api/krx-quote?symbol=${encodeURIComponent(ticker + '.' + exchange)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.price ?? null
  } catch {
    return null
  }
}
