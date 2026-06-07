const CACHE_TTL = 6 * 60 * 60 // 21600초

export async function onRequestGet(context) {
  const kv = context.env.LEDGER_CACHE
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  const cached = await kv.get('earnings_calendar', { type: 'json' })
  if (cached) return new Response(JSON.stringify(cached), { headers })

  const apiKey = context.env.ALPHAVANTAGE_KEY
  if (!apiKey) return new Response('[]', { headers })

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${apiKey}`
    )
    if (!res.ok) return new Response('[]', { headers })
    const csv = await res.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2 || lines[1].startsWith('I,n,f')) return new Response('[]', { headers })

    const result = lines.slice(1)
      .map(line => {
        const parts = line.split(',')
        return {
          symbol: parts[0]?.trim(),
          reportDate: parts[2]?.trim(),
          estimate: parts[4] ? parseFloat(parts[4]) : null,
        }
      })
      .filter(e => e.symbol && e.reportDate)

    await kv.put('earnings_calendar', JSON.stringify(result), { expirationTtl: CACHE_TTL })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response('[]', { headers })
  }
}
