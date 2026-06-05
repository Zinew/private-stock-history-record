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
      `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const quotes = (data.items ?? [])
      .filter(item => item.nationCode === 'KOR' && (item.typeCode === 'KOSPI' || item.typeCode === 'KOSDAQ'))
      .slice(0, 8)
      .map(item => {
        const exchange = item.typeCode === 'KOSPI' ? 'KS' : 'KQ'
        return {
          symbol: `${item.code}.${exchange}`,
          name: item.name,
          ticker: item.code,
          exchange,
        }
      })
    return new Response(JSON.stringify(quotes), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
