export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const code = url.searchParams.get('code') ?? ''
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  if (!code.trim()) {
    return new Response(JSON.stringify({ error: 'code required' }), { headers })
  }

  try {
    const naverUrl = `https://finance.naver.com/item/news_news.nhn?code=${encodeURIComponent(code)}&page=1`
    const naverRes = await fetch(naverUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })

    const articles = []
    let current = null

    const transformed = new HTMLRewriter()
      .on('table.type5 tbody tr', {
        element(el) {
          current = { title: '', source: '', publishedAt: '', url: '' }
          el.onEndTag(() => {
            if (current?.title?.trim() && current?.url) {
              articles.push({
                title: current.title.trim(),
                summary: null,
                source: current.source.trim(),
                url: current.url,
                publishedAt: current.publishedAt.trim(),
              })
            }
            current = null
          })
        },
      })
      .on('table.type5 tbody tr td.title a', {
        element(el) {
          const href = el.getAttribute('href') ?? ''
          if (current) current.url = href.startsWith('http') ? href : `https://finance.naver.com${href}`
        },
        text(chunk) {
          if (current) current.title += chunk.text
        },
      })
      .on('table.type5 tbody tr td.info', {
        text(chunk) {
          if (current) current.source += chunk.text
        },
      })
      .on('table.type5 tbody tr td.date', {
        text(chunk) {
          if (current) current.publishedAt += chunk.text
        },
      })
      .transform(naverRes)

    await transformed.arrayBuffer()

    const result = articles.filter(a => a.title).slice(0, 10)

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'no articles parsed' }), { headers })
    }

    return new Response(JSON.stringify(result), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers })
  }
}
