const CACHE_TTL = 60 * 60 // 3600초

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const symbol = url.searchParams.get('symbol') ?? ''
  const from   = url.searchParams.get('from') ?? ''
  const to     = url.searchParams.get('to') ?? ''
  const kv = context.env.LEDGER_CACHE
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (!symbol || !from || !to) return new Response('[]', { headers })

  const cacheKey = `company_news:${symbol}:${from}:${to}`
  const cached = await kv.get(cacheKey, { type: 'json' })
  if (cached) return new Response(JSON.stringify(cached), { headers })

  const apiKey = context.env.FINNHUB_KEY
  if (!apiKey) return new Response('[]', { headers })

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey}`
    )
    if (!res.ok) return new Response('[]', { headers })
    const data = await res.json()
    // SeekingAlpha 기사는 로그인 장벽이 있어 제외
    const filtered = Array.isArray(data)
      ? data.filter(item => !/seeking ?alpha/i.test(item.source || ''))
      : []
    const result = filtered.slice(0, 10).map(item => ({
      title: item.headline,
      summary: item.summary || null,
      source: item.source,
      url: item.url,
      publishedAtUnix: item.datetime,
    }))

    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response('[]', { headers })
  }
}
