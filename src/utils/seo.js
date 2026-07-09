// 프리렌더·sitemap용 순수 헬퍼 (브라우저·Node 공용 — Vite 전용 API 사용 금지)
export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildHeadTags({ title, description, url, ogType = 'website', jsonLd = null }) {
  const t = escapeHtml(title)
  const d = escapeHtml(description)
  const u = escapeHtml(url)
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${u}" />`,
    `<meta property="og:site_name" content="Ledger" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${u}" />`,
  ]
  if (jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`)
  return tags.join('\n    ')
}

export function injectHead(template, headTags) {
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/g, '')
    .replace(/<meta name="description"[^>]*>\s*/g, '')
    .replace(/<meta property="og:[^>]*>\s*/g, '')
    .replace(/<link rel="canonical"[^>]*>\s*/g, '')
    .replace('</head>', `${headTags}\n  </head>`)
}

export function injectRootHtml(template, innerHtml) {
  return template.replace('<div id="root"></div>', `<div id="root">${innerHtml}</div>`)
}

export function buildSitemapXml(entries) {
  const items = entries.map(({ url, lastmod }) => {
    const parts = [`    <loc>${escapeHtml(url)}</loc>`]
    if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`)
    return `  <url>\n${parts.join('\n')}\n  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`
}

export function buildArticleJsonLd({ title, description, date, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: date,
    dateModified: date,
    inLanguage: 'ko',
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Ledger 편집팀' },
    publisher: { '@type': 'Organization', name: 'Ledger' },
  }
}
