export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const q = url.searchParams.get('q') ?? ''
  if (!q.trim()) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=US`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const quotes = (data.quotes ?? [])
      .filter(item =>
        item.symbol &&
        (item.quoteType === 'EQUITY' || item.quoteType === 'ETF') &&
        !item.symbol.endsWith('.KS') &&
        !item.symbol.endsWith('.KQ') &&
        !item.symbol.includes('.')
      )
      .slice(0, 8)
      .map(item => ({
        symbol: item.symbol,
        name: item.shortname ?? item.longname ?? item.symbol,
        ticker: item.symbol,
      }))
    return new Response(JSON.stringify(quotes), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
