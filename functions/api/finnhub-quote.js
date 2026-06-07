const CACHE_TTL = 5 * 60 // 300초

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const symbol = url.searchParams.get('symbol') ?? ''
  const kv = context.env.LEDGER_CACHE
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (!symbol) return new Response(JSON.stringify({ price: null }), { headers })

  const cacheKey = `quote:${symbol}`
  const cached = await kv.get(cacheKey, { type: 'json' })
  if (cached) return new Response(JSON.stringify(cached), { headers })

  const apiKey = context.env.FINNHUB_KEY
  if (!apiKey) return new Response(JSON.stringify({ price: null }), { headers })

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
    )
    if (!res.ok) return new Response(JSON.stringify({ price: null }), { headers })
    const data = await res.json()
    const result = { price: data.c > 0 ? data.c : null }
    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response(JSON.stringify({ price: null }), { headers })
  }
}
