import {
  escapeHtml, buildHeadTags, injectHead, injectRootHtml,
  buildSitemapXml, buildArticleJsonLd,
} from '../../utils/seo.js'

const TEMPLATE = `<!doctype html>
<html lang="ko">
  <head>
    <title>Ledger</title>
    <meta name="description" content="old" />
    <meta property="og:title" content="old" />
    <script src="x.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

describe('escapeHtml', () => {
  it('특수문자를 이스케이프한다', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
})

describe('buildHeadTags', () => {
  it('title·description·canonical·OG 태그를 만든다', () => {
    const tags = buildHeadTags({ title: 'T — Ledger', description: 'D', url: 'https://ex.com/learn' })
    expect(tags).toContain('<title>T — Ledger</title>')
    expect(tags).toContain('<meta name="description" content="D"')
    expect(tags).toContain('<link rel="canonical" href="https://ex.com/learn"')
    expect(tags).toContain('og:title')
    expect(tags).not.toContain('application/ld+json')
  })
  it('jsonLd를 넘기면 ld+json 스크립트를 포함한다', () => {
    const tags = buildHeadTags({ title: 'T', description: 'D', url: 'https://ex.com/', jsonLd: { '@type': 'Article' } })
    expect(tags).toContain('application/ld+json')
    expect(tags).toContain('"@type":"Article"')
  })
})

describe('injectHead', () => {
  it('기존 title·meta를 제거하고 새 태그를 </head> 앞에 넣는다', () => {
    const out = injectHead(TEMPLATE, '<title>New</title>')
    expect(out).toContain('<title>New</title>')
    expect(out).not.toContain('<title>Ledger</title>')
    expect(out).not.toContain('content="old"')
    expect(out).toContain('<script src="x.js"></script>')
  })
})

describe('injectRootHtml', () => {
  it('#root 안에 정적 HTML을 넣는다', () => {
    const out = injectRootHtml(TEMPLATE, '<h1>hello</h1>')
    expect(out).toContain('<div id="root"><h1>hello</h1></div>')
  })
})

describe('buildSitemapXml', () => {
  it('url·lastmod 항목으로 XML을 만든다', () => {
    const xml = buildSitemapXml([
      { url: 'https://ex.com/' },
      { url: 'https://ex.com/learn/a', lastmod: '2026-06-13' },
    ])
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<loc>https://ex.com/</loc>')
    expect(xml).toContain('<lastmod>2026-06-13</lastmod>')
    expect((xml.match(/<url>/g) || []).length).toBe(2)
  })
})

describe('buildArticleJsonLd', () => {
  it('schema.org Article 객체를 만든다', () => {
    const ld = buildArticleJsonLd({ title: 'T', description: 'D', date: '2026-06-13', url: 'https://ex.com/learn/a' })
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Article')
    expect(ld.headline).toBe('T')
    expect(ld.datePublished).toBe('2026-06-13')
    expect(ld.author.name).toBe('Ledger 편집팀')
    expect(ld.inLanguage).toBe('ko')
  })
})
