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
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://finance.naver.com/',
          'Origin': 'https://finance.naver.com',
        },
      }
    )
    if (!res.ok) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
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
