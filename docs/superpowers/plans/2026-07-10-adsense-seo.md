# 애드센스 승인 대응 (SEO·홈 콘텐츠·신뢰 신호) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 애드센스 "가치가 별로 없는 콘텐츠" 반려에 대응해 (1) 크롤러가 실제 콘텐츠를 볼 수 있는 프리렌더링·메타·sitemap 구조, (2) 빈 홈 화면의 wizard + SEO 텍스트 콘텐츠, (3) 글 신뢰 신호(작성자·면책조항·연락처)를 구축한다.

**Architecture:** 풀 SSR 없이, 빌드 후 Node 스크립트(`scripts/prerender.mjs`)가 `dist/index.html`을 템플릿으로 각 라우트별 정적 HTML(`dist/<route>/index.html`)을 생성한다. 각 파일에 페이지별 `<title>`/description/OG/canonical/JSON-LD를 주입하고, 홈·learn·글 페이지는 `#root` 안에 정적 콘텐츠 HTML을 넣는다(React 18 `createRoot().render()`가 로드 후 교체하므로 하이드레이션 충돌 없음). Cloudflare Pages는 정적 파일을 `_redirects` 폴백보다 우선 서빙하므로 추가 설정 불필요. 런타임에는 `usePageMeta` 훅이 클라이언트 네비게이션 시 title/meta를 동기화한다.

**Tech Stack:** 기존 스택만 사용 — Vite 5, React 18, react-router-dom 7, react-i18next, marked, vitest. **새 npm 의존성 없음.**

## Global Constraints

- 사이트 URL: `https://private-stock-history-record.pages.dev` (설정은 `src/config/site.js` 한 곳에만 — 커스텀 도메인 구입 시 이 파일만 수정)
- 공개 연락처 이메일: 아직 미정 → `CONTACT_EMAIL = ''` 로 두고, 값이 있을 때만 About 연락처 섹션 렌더
- 애드센스 퍼블리셔 ID: `ca-pub-9431907803889596` (index.html에 이미 있음, 유지)
- 새 npm 패키지 추가 금지 (react-helmet 등 사용하지 않음)
- Node에서 import되는 파일(`src/config/site.js`, `src/utils/markdown.js`, `src/utils/seo.js`)에는 `import.meta.glob` 등 Vite 전용 API 사용 금지
- 모든 사용자 노출 문구는 i18n (ko.json + en.json 양쪽에 추가)
- 브랜치: `feature/adsense-seo` (main 직접 커밋 금지)
- 테스트: `npm test` (vitest), 커밋 전 통과 확인

---

### Task 0: 브랜치 생성

- [ ] **Step 1: feature 브랜치 생성**

```bash
git checkout -b feature/adsense-seo
```

---

### Task 1: markdown 유틸 분리 (Node-safe)

`src/utils/articles.js`의 순수 함수를 분리해 프리렌더 스크립트가 Node에서 import할 수 있게 한다. (`articles.js`는 `import.meta.glob`을 쓰므로 Node에서 import 불가)

**Files:**
- Create: `src/utils/markdown.js`
- Modify: `src/utils/articles.js`
- Modify: `src/__tests__/utils/articles.test.js` (import 경로만 변경)

**Interfaces:**
- Produces: `parseFrontmatter(raw) → { meta: object, body: string }`, `readingMinutes(text) → number` — Task 7의 prerender 스크립트가 사용

- [ ] **Step 1: markdown.js 생성** — `articles.js`의 `parseFrontmatter`, `readingMinutes`를 그대로 옮긴다

```js
// src/utils/markdown.js — 순수 마크다운 유틸 (브라우저·Node 공용, Vite 전용 API 금지)
export function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta = Object.fromEntries(
    match[1].split('\n')
      .filter(Boolean)
      .map(line => {
        const idx = line.indexOf(':')
        const k = line.slice(0, idx).trim()
        const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        return [k, v]
      })
  )
  return { meta, body: match[2] }
}

export function readingMinutes(text) {
  return Math.max(1, Math.ceil(text.length / 750))
}
```

- [ ] **Step 2: articles.js에서 두 함수 정의를 삭제하고 re-export로 교체**

```js
// src/utils/articles.js 상단
import { marked } from 'marked'
import { parseFrontmatter, readingMinutes } from './markdown.js'
export { parseFrontmatter, readingMinutes }
```

(기존 `parseFrontmatter`/`readingMinutes` 함수 본문 삭제, 나머지 `buildArticles`/`getArticles`/`getArticleBySlug`는 그대로)

- [ ] **Step 3: 기존 테스트 import 경로 변경**

`src/__tests__/utils/articles.test.js` 1행:
```js
import { parseFrontmatter, readingMinutes } from '../../utils/markdown.js'
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: 전체 PASS (기존 테스트 포함)

- [ ] **Step 5: Commit**

```bash
git add src/utils/markdown.js src/utils/articles.js src/__tests__/utils/articles.test.js
git commit -m "refactor: 마크다운 유틸을 Node-safe 모듈로 분리"
```

---

### Task 2: 사이트 설정 모듈

**Files:**
- Create: `src/config/site.js`

**Interfaces:**
- Produces: `SITE_URL: string`, `SITE_NAME: string`, `DEFAULT_DESCRIPTION: string`, `CONTACT_EMAIL: string`, `PAGE_META: Record<path, {title, description}>` — Task 3(훅), 7(프리렌더), 11(About)이 사용

- [ ] **Step 1: site.js 작성**

```js
// src/config/site.js — 사이트 전역 설정 (브라우저·Node 공용)
// 커스텀 도메인 구입 시 SITE_URL만 변경하면 sitemap/canonical/OG 전체에 반영된다.
export const SITE_URL = 'https://private-stock-history-record.pages.dev'
export const SITE_NAME = 'Ledger'
export const DEFAULT_DESCRIPTION =
  '국내·해외 주식을 한 화면에서 추적하는 프라이버시 우선 포트폴리오 트래커. 실시간 시세, 수익률, 리밸런싱 가이드와 투자 학습 콘텐츠를 제공합니다.'
// 서비스용 이메일이 준비되면 입력 — 값이 있으면 About 페이지에 연락처 섹션이 자동 표시된다.
export const CONTACT_EMAIL = ''

export const PAGE_META = {
  '/': {
    title: 'Ledger — 국내·해외 주식 포트폴리오 트래커',
    description: DEFAULT_DESCRIPTION,
  },
  '/learn': {
    title: '투자 가이드 — Ledger',
    description: '한국·미국 주식 투자 실전 지식 — 세금, 리밸런싱, ETF, 배당, 환율, 연금까지 초보자 눈높이로 정리한 투자 가이드.',
  },
  '/news': {
    title: '시장 뉴스 — Ledger',
    description: '보유 종목과 시장 관련 국내외 뉴스를 감성 분석과 함께 한눈에 확인하세요.',
  },
  '/calendar': {
    title: '투자 캘린더 — Ledger',
    description: '거래 내역과 포트폴리오 이벤트를 달력 형태로 확인하는 투자 기록 캘린더.',
  },
  '/about': {
    title: 'Ledger 소개 — 프라이버시 우선 포트폴리오 트래커',
    description: 'Ledger는 모든 데이터를 사용자의 브라우저에만 저장하는 프라이버시 우선 주식 포트폴리오 트래커입니다. 만든 이유와 데이터 출처를 소개합니다.',
  },
  '/help': {
    title: '도움말 — Ledger 사용법',
    description: 'Ledger 사용법 안내 — 종목 추가, 실시간 시세, 스냅샷, 리밸런싱, 데이터 백업까지 단계별로 설명합니다.',
  },
  '/privacy': {
    title: '개인정보처리방침 — Ledger',
    description: 'Ledger의 데이터 처리 원칙 — 포트폴리오 데이터는 서버로 전송되지 않고 사용자의 브라우저에만 저장됩니다.',
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/config/site.js
git commit -m "feat: 사이트 전역 설정 모듈 추가 (URL·메타 단일 관리)"
```

---

### Task 3: usePageMeta 훅 + 전 페이지 적용

**Files:**
- Create: `src/hooks/usePageMeta.js`
- Modify: `src/pages/DashboardPage.jsx`, `LearnPage.jsx`, `ArticlePage.jsx`, `AboutPage.jsx`, `HelpPage.jsx`, `PrivacyPage.jsx`, `NewsPage.jsx`, `CalendarPage.jsx`, `NotFoundPage.jsx`

**Interfaces:**
- Consumes: `PAGE_META`, `SITE_URL`, `SITE_NAME` (Task 2)
- Produces: `usePageMeta({ title, description, path })` — SPA 네비게이션 시 document.title/meta/canonical 동기화

- [ ] **Step 1: 훅 작성**

```js
// src/hooks/usePageMeta.js
import { useEffect } from 'react'
import { SITE_URL } from '../config/site.js'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// 클라이언트 네비게이션 시 페이지별 title/description/canonical/OG를 동기화한다.
// 초기 HTML의 메타는 프리렌더 스크립트(scripts/prerender.mjs)가 담당한다.
export function usePageMeta({ title, description, path }) {
  useEffect(() => {
    if (title) {
      document.title = title
      upsertMeta('property', 'og:title', title)
    }
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
    }
    if (path != null) {
      const url = SITE_URL + path
      upsertMeta('property', 'og:url', url)
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', url)
    }
  }, [title, description, path])
}
```

- [ ] **Step 2: 정적 라우트 페이지 8곳에 적용**

각 페이지 컴포넌트 함수 첫 부분에 추가 (예: LearnPage):
```js
import { usePageMeta } from '../hooks/usePageMeta.js'
import { PAGE_META } from '../config/site.js'
// 컴포넌트 안:
usePageMeta({ ...PAGE_META['/learn'], path: '/learn' })
```
- DashboardPage → `'/'`, NewsPage → `'/news'`, CalendarPage → `'/calendar'`, AboutPage → `'/about'`, HelpPage → `'/help'`, PrivacyPage → `'/privacy'`
- NotFoundPage → `usePageMeta({ title: '페이지를 찾을 수 없습니다 — Ledger' })` (path 없음)

- [ ] **Step 3: ArticlePage에 글별 메타 적용**

`ArticlePage`의 `if (!article)` 반환 **앞이 아니라 뒤**, `const all = ...` 앞에 훅을 두면 조건부 훅 호출이 되므로, 훅 규칙을 지키기 위해 아래처럼 **항상 호출**한다:

```js
import { usePageMeta } from '../hooks/usePageMeta.js'
import { SITE_NAME } from '../config/site.js'
// 컴포넌트 안, article 조회 직후 · early return 이전:
const article = getArticleBySlug(slug)
usePageMeta(article ? {
  title: `${article.title} — ${SITE_NAME}`,
  description: article.description,
  path: `/learn/${article.slug}`,
} : { title: `글을 찾을 수 없습니다 — ${SITE_NAME}` })
if (!article) { ... }
```

- [ ] **Step 4: 수동 확인 + 테스트**

Run: `npm run dev` 후 브라우저에서 `/learn` → 탭 제목이 "투자 가이드 — Ledger"로 바뀌는지, 글 페이지에서 글 제목으로 바뀌는지 확인.
Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePageMeta.js src/pages/
git commit -m "feat: 페이지별 동적 메타(title/description/canonical/OG) 훅 적용"
```

---

### Task 4: index.html 기본 메타 + robots.txt

**Files:**
- Modify: `index.html`
- Create: `public/robots.txt`

- [ ] **Step 1: index.html 보강** — `<html lang="ko">`로 바꾸고 head에 기본 메타 추가

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ledger — 국내·해외 주식 포트폴리오 트래커</title>
    <meta name="description" content="국내·해외 주식을 한 화면에서 추적하는 프라이버시 우선 포트폴리오 트래커. 실시간 시세, 수익률, 리밸런싱 가이드와 투자 학습 콘텐츠를 제공합니다." />
    <meta property="og:site_name" content="Ledger" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Ledger — 국내·해외 주식 포트폴리오 트래커" />
    <meta property="og:description" content="국내·해외 주식을 한 화면에서 추적하는 프라이버시 우선 포트폴리오 트래커." />
    <meta property="og:url" content="https://private-stock-history-record.pages.dev/" />
    <meta name="google-adsense-account" content="ca-pub-9431907803889596">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9431907803889596"
     crossorigin="anonymous"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

(주의: 이 title/description/OG는 프리렌더 스크립트가 라우트별 값으로 **교체**한다 — Task 7의 `injectHead`가 기존 태그를 제거 후 삽입)

- [ ] **Step 2: robots.txt 생성**

```
User-agent: *
Allow: /

Sitemap: https://private-stock-history-record.pages.dev/sitemap.xml
```

- [ ] **Step 3: Commit**

```bash
git add index.html public/robots.txt
git commit -m "feat: 기본 메타태그(lang·description·OG) 및 robots.txt 추가"
```

---

### Task 5: SEO 헬퍼 함수 (TDD)

**Files:**
- Create: `src/utils/seo.js`
- Test: `src/__tests__/utils/seo.test.js`

**Interfaces:**
- Produces (Task 7 프리렌더가 사용):
  - `escapeHtml(s: string) → string`
  - `buildHeadTags({ title, description, url, ogType?, jsonLd? }) → string` (title+meta+canonical+OG+JSON-LD 태그 문자열)
  - `injectHead(template: string, headTags: string) → string` (템플릿의 기존 title/description/og/canonical 제거 후 `</head>` 앞에 삽입)
  - `injectRootHtml(template: string, innerHtml: string) → string` (`<div id="root"></div>` 안에 정적 콘텐츠 주입)
  - `buildSitemapXml(entries: Array<{ url: string, lastmod?: string }>) → string`
  - `buildArticleJsonLd({ title, description, date, url }) → object` (schema.org Article)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// src/__tests__/utils/seo.test.js
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
    expect(out).toContain('<script src="x.js"></script>') // 스크립트는 보존
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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- seo`
Expected: FAIL — `Cannot find module '../../utils/seo.js'` 류의 오류

- [ ] **Step 3: 구현**

```js
// src/utils/seo.js — 프리렌더·sitemap용 순수 헬퍼 (브라우저·Node 공용)
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- seo`
Expected: PASS (전체 스위트도 `npm test`로 확인)

- [ ] **Step 5: Commit**

```bash
git add src/utils/seo.js src/__tests__/utils/seo.test.js
git commit -m "feat: SEO 헬퍼(head 주입·sitemap·JSON-LD) 추가"
```

---

### Task 6: i18n 콘텐츠 키 추가 (wizard·홈 가이드·글 신뢰 신호)

**Files:**
- Modify: `src/locales/ko.json`, `src/locales/en.json`

**Interfaces:**
- Produces: `wizard.*`, `homeGuide.*`, `article.*`, `about.contact*` 키 — Task 8/9/10이 사용. **프리렌더 스크립트(Task 7)도 ko.json의 `homeGuide.*`를 직접 읽어 홈 정적 HTML을 만든다** (콘텐츠 단일 출처)

- [ ] **Step 1: ko.json에 키 추가** (기존 최상위 구조에 병합)

```json
{
  "wizard": {
    "step1Title": "Ledger에 오신 것을 환영합니다",
    "step1Body": "Ledger는 국내·해외 주식을 한 화면에서 추적하는 포트폴리오 트래커입니다. 회원가입 없이 바로 사용하고, 모든 데이터는 내 브라우저에만 저장됩니다.",
    "step2Title": "종목을 추가하면 자동으로 계산됩니다",
    "step2Body": "보유 종목의 티커와 매수 내역을 입력하면 실시간 시세(미국: Finnhub, 한국: Yahoo Finance)로 평가금액·수익률·환율 영향까지 자동 계산됩니다.",
    "step3Title": "기록하고, 배우고, 리밸런싱하세요",
    "step3Body": "자산 스냅샷으로 추이를 기록하고, 목표 비중을 정해 리밸런싱 가이드를 받고, 투자 가이드에서 세금·ETF·연금 지식을 학습할 수 있습니다.",
    "next": "다음",
    "back": "이전",
    "start": "첫 종목 추가하기",
    "skip": "건너뛰기"
  },
  "homeGuide": {
    "introTitle": "Ledger는 어떤 서비스인가요?",
    "introBody": "Ledger는 한국 주식과 미국 주식을 하나의 화면에서 관리하는 무료 포트폴리오 트래커입니다. 증권사 앱을 여러 개 오가지 않아도 전체 자산의 평가금액, 수익률, 통화별 비중을 한눈에 볼 수 있습니다. 회원가입이 필요 없고 포트폴리오 데이터는 서버로 전송되지 않으며 사용 중인 브라우저에만 저장되는 프라이버시 우선 설계입니다.",
    "stepsTitle": "3단계로 시작하기",
    "step1Title": "종목 추가",
    "step1Body": "보유한 종목의 티커(예: AAPL, 005930)와 매수 수량·단가를 입력합니다. 한국·미국 종목 모두 검색으로 쉽게 찾을 수 있습니다.",
    "step2Title": "자동 시세·수익률 확인",
    "step2Body": "실시간 시세가 자동으로 반영되어 평가금액, 손익, 수익률이 계산됩니다. 원화·달러 표시를 전환하며 환율 영향도 확인할 수 있습니다.",
    "step3Title": "기록과 리밸런싱",
    "step3Body": "자산 스냅샷으로 포트폴리오 추이를 기록하고, 종목별 목표 비중을 설정하면 리밸런싱 가이드가 매수·매도 금액을 계산해 줍니다.",
    "featuresTitle": "주요 기능",
    "feature1": "한국(KRX)·미국 주식 실시간 시세와 통합 수익률",
    "feature2": "원화 ↔ 달러 표시 전환과 환율 영향 분석",
    "feature3": "목표 비중 기반 리밸런싱 가이드",
    "feature4": "자산 추이 스냅샷, 거래 내역, 투자 캘린더, 종목 뉴스",
    "faqTitle": "자주 묻는 질문",
    "faq1q": "정말 무료인가요?",
    "faq1a": "네, 모든 기능이 무료입니다. 회원가입도 필요 없습니다.",
    "faq2q": "내 포트폴리오 데이터는 어디에 저장되나요?",
    "faq2a": "사용 중인 브라우저의 로컬 저장소에만 저장됩니다. 서버로 전송되지 않으므로 운영자를 포함해 누구도 볼 수 없습니다. 기기를 바꾸는 경우를 대비해 백업(내보내기) 기능을 제공합니다.",
    "faq3q": "어떤 종목을 지원하나요?",
    "faq3a": "한국거래소(KRX) 상장 종목과 미국 상장 주식·ETF를 지원합니다. 시세는 미국은 Finnhub, 한국은 Yahoo Finance 데이터를 사용합니다.",
    "faq4q": "증권사 계좌와 연동되나요?",
    "faq4a": "아니요. Ledger는 계좌 연동 없이 직접 입력한 내역을 기반으로 동작합니다. 계좌 비밀번호나 인증서가 필요 없어 보안 걱정 없이 사용할 수 있습니다.",
    "faq5q": "투자 판단에 활용해도 되나요?",
    "faq5a": "Ledger가 제공하는 모든 정보는 기록·시각화·학습 용도이며 투자 권유나 자문이 아닙니다. 투자 결정과 그 결과에 대한 책임은 투자자 본인에게 있습니다.",
    "articlesTitle": "투자 가이드에서 배우기",
    "articlesMore": "가이드 전체 보기 →"
  },
  "article": {
    "author": "Ledger 편집팀",
    "disclaimerTitle": "면책 안내",
    "disclaimerBody": "이 글은 일반적인 투자 지식과 정보를 전달하기 위한 것으로, 특정 상품의 매수·매도 권유나 투자 자문이 아닙니다. 세금·제도 관련 내용은 작성 시점 기준이며 변경될 수 있으므로 중요한 결정 전에는 국세청·금융기관 등 공식 출처를 확인하세요. 투자 결정과 그 결과에 대한 책임은 투자자 본인에게 있습니다."
  }
}
```

`about`에 추가:
```json
"contactTitle": "문의하기",
"contactBody": "서비스 관련 문의·제안·오류 제보는 아래 이메일로 보내주세요."
```

- [ ] **Step 2: en.json에 동일 키의 영어 번역 추가** (전체 키 1:1 대응, 자연스러운 영어로)

- [ ] **Step 3: JSON 유효성 + 테스트 확인**

Run: `npm test`
Expected: PASS. `npm run dev`로 콘솔에 i18n 누락 경고 없는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/locales/ko.json src/locales/en.json
git commit -m "feat: wizard·홈 가이드·글 면책조항 i18n 문구 추가"
```

---

### Task 7: 프리렌더 + sitemap 빌드 스크립트

**Files:**
- Create: `scripts/prerender.mjs`
- Modify: `package.json` (build 스크립트)

**Interfaces:**
- Consumes: `parseFrontmatter`/`readingMinutes` (Task 1), `SITE_URL`/`PAGE_META` (Task 2), `seo.js` 헬퍼 전부 (Task 5), `src/locales/ko.json`의 `homeGuide.*` (Task 6)
- Produces: `dist/<route>/index.html` (라우트별 메타 주입), `dist/learn/<slug>/index.html` (글 본문 포함), `dist/sitemap.xml`

- [ ] **Step 1: 스크립트 작성**

```js
// scripts/prerender.mjs — vite build 후 실행. 라우트별 정적 HTML과 sitemap.xml을 생성한다.
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

// ── 홈: 메타 + wizard/가이드와 동일 문구의 정적 콘텐츠 (출처: ko.json homeGuide)
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

// ── 정적 라우트 (홈 제외): 메타만 주입
for (const route of Object.keys(PAGE_META).filter(r => r !== '/')) {
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
```

- [ ] **Step 2: package.json build 스크립트 수정**

```json
"build": "vite build && node scripts/prerender.mjs",
```

- [ ] **Step 3: 빌드 실행 및 산출물 검증**

Run: `npm run build`
Expected: `prerender: 7개 라우트 + 18개 글 + sitemap.xml 생성 완료`

확인 (PowerShell):
```powershell
Test-Path dist/learn/us-etf-guide/index.html   # True
Select-String -Path dist/learn/us-etf-guide/index.html -Pattern 'og:title','ld\+json','article'  # 매치 존재
Select-String -Path dist/index.html -Pattern 'faq','어떤 서비스'  # 홈 정적 콘텐츠 존재
Test-Path dist/sitemap.xml  # True — 25개 <url>
```

- [ ] **Step 4: preview로 실제 서빙 확인**

Run: `npm run preview` 후 `Invoke-WebRequest http://localhost:4173/learn/us-etf-guide/` — 응답 본문에 글 텍스트와 `<title>`이 글 제목인지 확인. 브라우저에서 접속해 React 앱이 정상 로드되는지(정적 콘텐츠가 앱으로 교체되는지) 확인.

- [ ] **Step 5: Commit**

```bash
git add scripts/prerender.mjs package.json
git commit -m "feat: 빌드 타임 프리렌더링 + sitemap.xml 생성 스크립트"
```

---

### Task 8: 온보딩 Wizard 컴포넌트

**Files:**
- Create: `src/components/home/OnboardingWizard.jsx`
- Modify: `src/components/HoldingsTable.jsx` (addbar div에 `id="add-holding"` 추가)
- Modify: `src/pages/DashboardPage.jsx` (빈 상태일 때 상단에 렌더)
- Modify: `src/styles/pages.css` (스타일 — 프로젝트의 css import 방식은 `src/main.jsx` 또는 `src/index.css`에서 확인 후 동일 패턴 적용)

**Interfaces:**
- Consumes: `wizard.*` i18n 키 (Task 6)
- Produces: `<OnboardingWizard />` — props 없음. 마지막 스텝 CTA는 `document.getElementById('add-holding')`으로 스크롤. `localStorage['ledgerWizardDismissed'] = '1'`로 건너뛰기 상태 저장.

- [ ] **Step 1: 컴포넌트 작성**

```jsx
// src/components/home/OnboardingWizard.jsx — 첫 방문자(보유 종목 0개) 온보딩 3단계 wizard
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const DISMISS_KEY = 'ledgerWizardDismissed'

export default function OnboardingWizard() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  if (dismissed) return null

  const steps = [1, 2, 3].map(i => ({
    title: t(`wizard.step${i}Title`),
    body: t(`wizard.step${i}Body`),
  }))
  const isLast = step === steps.length - 1

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }
  function start() {
    dismiss()
    document.getElementById('add-holding')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="wizard" role="region" aria-label={t('wizard.step1Title')}>
      <button className="wizard-skip" onClick={dismiss}>{t('wizard.skip')}</button>
      <div className="wizard-dots">
        {steps.map((_, i) => (
          <span key={i} className={`wizard-dot${i === step ? ' active' : ''}`} onClick={() => setStep(i)} />
        ))}
      </div>
      <h2 className="wizard-title">{steps[step].title}</h2>
      <p className="wizard-body">{steps[step].body}</p>
      <div className="wizard-actions">
        {step > 0 && <button className="btn wizard-back" onClick={() => setStep(step - 1)}>{t('wizard.back')}</button>}
        {isLast
          ? <button className="btn wizard-next" onClick={start}>{t('wizard.start')}</button>
          : <button className="btn wizard-next" onClick={() => setStep(step + 1)}>{t('wizard.next')}</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: HoldingsTable addbar에 앵커 id 추가**

`src/components/HoldingsTable.jsx:92`:
```jsx
<div ref={addbarRef} id="add-holding">
```

- [ ] **Step 3: DashboardPage 통합** — 보유 종목이 없을 때만 최상단에 표시

```jsx
import OnboardingWizard from '../components/home/OnboardingWizard.jsx'
// return 내부, <Charts /> 위:
{portfolio.holdings.length === 0 && <OnboardingWizard />}
```

- [ ] **Step 4: 스타일 추가** — 기존 카드 스타일(`.holdings`, `.empty-state` 등)과 톤을 맞춰 `.wizard`(카드 배경·패딩·라운드), `.wizard-dots`/`.wizard-dot(.active)`, `.wizard-skip`(우상단 텍스트 버튼), `.wizard-actions`(버튼 행) 스타일을 추가. 기존 변수/클래스 재사용(`.btn`).

- [ ] **Step 5: 수동 확인**

Run: `npm run dev` — 시크릿 창(localStorage 빈 상태)에서 wizard 표시, 스텝 이동, 건너뛰기 후 새로고침 시 미표시, "첫 종목 추가하기" 클릭 시 입력 폼으로 스크롤 확인. `npm test` PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/OnboardingWizard.jsx src/components/HoldingsTable.jsx src/pages/DashboardPage.jsx src/styles/
git commit -m "feat: 첫 방문자 온보딩 wizard 추가"
```

---

### Task 9: 홈 SEO 콘텐츠 섹션 (HomeGuide)

**Files:**
- Create: `src/components/home/HomeGuide.jsx`
- Modify: `src/pages/DashboardPage.jsx`
- Modify: `src/styles/pages.css` (또는 Task 8과 동일한 스타일 파일)

**Interfaces:**
- Consumes: `homeGuide.*` i18n 키 (Task 6), `getArticles()` (`src/utils/articles.js`)
- Produces: `<HomeGuide />` — props 없음. 보유 종목이 없을 때 대시보드 하단에 렌더 (프리렌더된 홈 정적 HTML과 같은 내용을 React로 렌더)

- [ ] **Step 1: 컴포넌트 작성**

```jsx
// src/components/home/HomeGuide.jsx — 홈 하단 서비스 소개·사용법·FAQ (SEO 콘텐츠, 프리렌더와 동일 문구)
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getArticles } from '../../utils/articles.js'

export default function HomeGuide() {
  const { t } = useTranslation()
  const articles = getArticles().slice(0, 6)
  return (
    <div className="home-guide">
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.introTitle')}</h2>
        <p>{t('homeGuide.introBody')}</p>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.stepsTitle')}</h2>
        <ol className="home-guide-steps">
          {[1, 2, 3].map(i => (
            <li key={i}><strong>{t(`homeGuide.step${i}Title`)}</strong> — {t(`homeGuide.step${i}Body`)}</li>
          ))}
        </ol>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.featuresTitle')}</h2>
        <ul className="static-list">
          {[1, 2, 3, 4].map(i => <li key={i}>{t(`homeGuide.feature${i}`)}</li>)}
        </ul>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.articlesTitle')}</h2>
        <ul className="home-guide-articles">
          {articles.map(a => (
            <li key={a.slug}><Link to={`/learn/${a.slug}`}>{a.title}</Link> — {a.description}</li>
          ))}
        </ul>
        <Link to="/learn">{t('homeGuide.articlesMore')}</Link>
      </section>
      <section className="static-section">
        <h2 className="holdings-title">{t('homeGuide.faqTitle')}</h2>
        {[1, 2, 3, 4, 5].map(i => (
          <details key={i} className="home-guide-faq">
            <summary>{t(`homeGuide.faq${i}q`)}</summary>
            <p>{t(`homeGuide.faq${i}a`)}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: DashboardPage 통합** — `<BackupBar />` 아래, `<footer>` 위에:

```jsx
import HomeGuide from '../components/home/HomeGuide.jsx'
// ...
{portfolio.holdings.length === 0 && <HomeGuide />}
```

- [ ] **Step 3: 스타일 추가** — `.home-guide`(카드형 섹션 간격), `.home-guide-faq summary`(포인터·굵게), `.home-guide-steps li`(간격). 기존 `.static-section`/`.static-list` 스타일 재사용.

- [ ] **Step 4: 수동 확인 + 테스트**

Run: `npm run dev` — 시크릿 창에서 홈 하단에 소개·사용법·FAQ 표시 확인, 종목 추가 후에는 미표시 확인. `npm test` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HomeGuide.jsx src/pages/DashboardPage.jsx src/styles/
git commit -m "feat: 홈 화면 서비스 소개·사용법·FAQ 콘텐츠 섹션 추가"
```

---

### Task 10: 글 신뢰 신호 (작성자·면책조항) + About 연락처

**Files:**
- Modify: `src/pages/ArticlePage.jsx`
- Modify: `src/pages/AboutPage.jsx`
- Modify: `src/styles/learn.css` (면책 박스 스타일)

**Interfaces:**
- Consumes: `article.*`, `about.contact*` i18n 키 (Task 6), `CONTACT_EMAIL` (Task 2)

- [ ] **Step 1: ArticlePage에 작성자·면책조항 추가**

```jsx
import { useTranslation } from 'react-i18next'
// 컴포넌트 안:
const { t } = useTranslation()
// 메타 줄 수정:
<p className="article-meta">{article.date} · {article.minutes}분 읽기 · {t('article.author')}</p>
// 본문(learn-content div)과 하단 AdBanner 사이에:
<div className="article-disclaimer">
  <strong>{t('article.disclaimerTitle')}</strong>
  <p>{t('article.disclaimerBody')}</p>
</div>
```

- [ ] **Step 2: 면책 박스 스타일** — `src/styles/learn.css`에 `.article-disclaimer` (연한 배경, 좌측 보더, 작은 글씨, 상하 마진) 추가. 기존 learn.css의 색 변수·톤 재사용.

- [ ] **Step 3: AboutPage에 연락처 섹션 추가** (CONTACT_EMAIL 있을 때만)

```jsx
import { CONTACT_EMAIL } from '../config/site.js'
// 마지막 section 아래:
{CONTACT_EMAIL && (
  <section className="static-section">
    <h2 className="holdings-title">{t('about.contactTitle')}</h2>
    <p>{t('about.contactBody')} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
  </section>
)}
```

- [ ] **Step 4: 수동 확인 + 테스트**

Run: `npm run dev` — 글 페이지에서 작성자 표기·면책 박스 확인. About은 CONTACT_EMAIL이 빈 값이므로 변화 없음(정상). `npm test` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ArticlePage.jsx src/pages/AboutPage.jsx src/styles/learn.css
git commit -m "feat: 글 작성자·면책조항 및 About 연락처(조건부) 추가"
```

---

### Task 11: 최종 검증

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전체 PASS

- [ ] **Step 2: 린트**

Run: `npm run lint`
Expected: 에러 0

- [ ] **Step 3: 프로덕션 빌드 + 산출물 전수 확인**

Run: `npm run build`
확인:
- `dist/` 아래 `about/ help/ privacy/ learn/ news/ calendar/` 디렉토리와 `learn/<slug>/` 18개 존재
- `dist/sitemap.xml`에 `<url>` 25개
- `dist/index.html`에 홈 정적 콘텐츠(FAQ 등)와 페이지별 메타 존재
- `dist/robots.txt` 존재

- [ ] **Step 4: preview 스모크 테스트**

Run: `npm run preview` — 홈(wizard·가이드), `/learn/us-etf-guide/`(정적 → React 교체), `/about` 정상 동작 확인.

- [ ] **Step 5: 최종 커밋 & 푸시**

```bash
git push -u origin feature/adsense-seo
```

(머지·배포는 superpowers:finishing-a-development-branch 흐름으로 사용자와 결정)

---

## 배포 후 체크리스트 (코드 외 — 사용자 액션 필요)

1. Cloudflare Pages 배포 확인 후 `view-source:https://private-stock-history-record.pages.dev/learn/us-etf-guide/` 에서 글 본문·메타 보이는지 확인
2. Google Search Console에 사이트 등록 → sitemap.xml 제출 → 주요 페이지 색인 확인 (수일 소요)
3. 커스텀 도메인 구입(Cloudflare Registrar 권장) → Pages 연결 → `src/config/site.js`의 `SITE_URL` 변경 후 재배포
4. 서비스용 이메일 생성 → `CONTACT_EMAIL` 입력 후 재배포
5. 색인 확인 + 1~2주 운영 후 애드센스 재신청 (커스텀 도메인 기준으로)
