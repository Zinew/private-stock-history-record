export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const symbol = url.searchParams.get('symbol') ?? ''
  if (!symbol.trim()) {
    return new Response(JSON.stringify({ price: null }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
    return new Response(JSON.stringify({ price: price != null && price > 0 ? price : null }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch {
    return new Response(JSON.stringify({ price: null }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
