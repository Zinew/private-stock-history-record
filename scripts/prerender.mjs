// vite build 후 실행. 라우트별 정적 HTML과 sitemap.xml을 생성한다.
// 크롤러는 이 정적 HTML의 메타·본문을 읽고, 브라우저에서는 React가 #root를 다시 렌더한다.
import fs from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'
import { parseFrontmatter, readingMinutes } from '../src/utils/markdown.js'
import { SITE_URL, PAGE_META } from '../src/config/site.js'
import {
  escapeHtml, buildHeadTags, injectHead, injectRootHtml,
  buildSitemapXml, buildArticleJsonLd,
} from '../src/utils/seo.js'

const DIST = path.resolve('dist')
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
const ko = JSON.parse(fs.readFileSync(path.resolve('src/locales/ko.json'), 'utf8'))

// ── 글 로드 (src/utils/articles.js와 동일한 규칙, Node에서는 fs로 읽는다)
const articlesDir = path.resolve('src/content/articles')
const articles = fs.readdirSync(articlesDir)
  .filter(f => f.endsWith('.md'))
  .map(f => {
    const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(articlesDir, f), 'utf8'))
    return { ...meta, minutes: readingMinutes(body), html: marked(body) }
  })
  .filter(a => a.slug)
  .sort((a, b) => b.date.localeCompare(a.date))

function writeRoute(route, html) {
  const dir = route === '/' ? DIST : path.join(DIST, route)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
}

// ── 홈: 메타 + 가이드와 동일 문구의 정적 콘텐츠 (출처: ko.json homeGuide)
const g = ko.homeGuide
const homeContent = `
<main>
  <h1>${escapeHtml(PAGE_META['/'].title)}</h1>
  <section><h2>${escapeHtml(g.introTitle)}</h2><p>${escapeHtml(g.introBody)}</p></section>
  <section><h2>${escapeHtml(g.stepsTitle)}</h2><ol>
    <li><strong>${escapeHtml(g.step1Title)}</strong> — ${escapeHtml(g.step1Body)}</li>
    <li><strong>${escapeHtml(g.step2Title)}</strong> — ${escapeHtml(g.step2Body)}</li>
    <li><strong>${escapeHtml(g.step3Title)}</strong> — ${escapeHtml(g.step3Body)}</li>
  </ol></section>
  <section><h2>${escapeHtml(g.featuresTitle)}</h2><ul>
    ${[g.feature1, g.feature2, g.feature3, g.feature4].map(f => `<li>${escapeHtml(f)}</li>`).join('')}
  </ul></section>
  <section><h2>${escapeHtml(g.faqTitle)}</h2>
    ${[1, 2, 3, 4, 5].map(i => `<h3>${escapeHtml(g[`faq${i}q`])}</h3><p>${escapeHtml(g[`faq${i}a`])}</p>`).join('')}
  </section>
  <section><h2>${escapeHtml(g.articlesTitle)}</h2><ul>
    ${articles.slice(0, 6).map(a => `<li><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a> — ${escapeHtml(a.description)}</li>`).join('')}
  </ul></section>
</main>`
writeRoute('/', injectRootHtml(
  injectHead(template, buildHeadTags({ ...PAGE_META['/'], url: SITE_URL + '/' })),
  homeContent,
))

// ── 정적 라우트 (홈·learn 제외): 메타만 주입
for (const route of Object.keys(PAGE_META).filter(r => r !== '/' && r !== '/learn')) {
  writeRoute(route, injectHead(template, buildHeadTags({ ...PAGE_META[route], url: SITE_URL + route })))
}

// ── /learn: 메타 + 글 목록 정적 콘텐츠
const learnContent = `
<main>
  <h1>투자 가이드</h1>
  <p>한국·미국 주식 투자 실전 지식을 쉽게 정리했습니다</p>
  <ul>${articles.map(a =>
    `<li><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a> — ${escapeHtml(a.description)} (${a.date} · ${a.minutes}분)</li>`
  ).join('\n')}</ul>
</main>`
writeRoute('/learn', injectRootHtml(
  injectHead(template, buildHeadTags({ ...PAGE_META['/learn'], url: SITE_URL + '/learn' })),
  learnContent,
))

// ── 글 페이지: 메타 + JSON-LD + 본문 전체
for (const a of articles) {
  const url = `${SITE_URL}/learn/${a.slug}`
  const head = buildHeadTags({
    title: `${a.title} — Ledger`,
    description: a.description,
    url,
    ogType: 'article',
    jsonLd: buildArticleJsonLd({ title: a.title, description: a.description, date: a.date, url }),
  })
  const content = `
<main><article>
  <h1>${escapeHtml(a.title)}</h1>
  <p>${a.date} · ${a.minutes}분 읽기 · ${escapeHtml(ko.article.author)}</p>
  ${a.html}
  <p><strong>${escapeHtml(ko.article.disclaimerTitle)}</strong> ${escapeHtml(ko.article.disclaimerBody)}</p>
  <p><a href="/learn">← 투자 가이드 목록</a></p>
</article></main>`
  writeRoute(`/learn/${a.slug}`, injectRootHtml(injectHead(template, head), content))
}

// ── sitemap.xml
const entries = [
  ...Object.keys(PAGE_META).map(r => ({ url: SITE_URL + (r === '/' ? '/' : r) })),
  ...articles.map(a => ({ url: `${SITE_URL}/learn/${a.slug}`, lastmod: a.date })),
]
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemapXml(entries))

console.log(`prerender: ${Object.keys(PAGE_META).length}개 라우트 + ${articles.length}개 글 + sitemap.xml 생성 완료`)
