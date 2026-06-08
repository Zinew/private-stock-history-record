const CACHE_TTL = 60 * 60 // 3600초

function stripHtml(str) {
  return (str ?? '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()
}

function formatPubDate(pubDate) {
  const d = new Date(pubDate)
  if (isNaN(d)) return pubDate
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function sourceFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const code = url.searchParams.get('code') ?? ''
  const name = url.searchParams.get('name') ?? ''
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (!code.trim() || !name.trim()) {
    return new Response('[]', { headers })
  }

  const kv = context.env.LEDGER_CACHE
  const cacheKey = `naver_news:${code}`
  if (kv) {
    const cached = await kv.get(cacheKey, { type: 'json' })
    if (cached) return new Response(JSON.stringify(cached), { headers })
  }

  const clientId = context.env.NAVER_CLIENT_ID
  const clientSecret = context.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return new Response('[]', { headers })

  try {
    const apiUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(name)}&display=10&sort=date`
    const res = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })
    if (!res.ok) return new Response('[]', { headers })
    const data = await res.json()

    const result = (data.items ?? []).slice(0, 10).map(item => ({
      title: stripHtml(item.title),
      summary: stripHtml(item.description) || null,
      source: sourceFromUrl(item.originallink || item.link),
      url: item.originallink || item.link,
      publishedAt: formatPubDate(item.pubDate),
    }))

    if (kv) await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL })
    return new Response(JSON.stringify(result), { headers })
  } catch {
    return new Response('[]', { headers })
  }
}
