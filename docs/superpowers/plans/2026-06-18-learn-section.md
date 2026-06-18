# Learn 섹션 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AdSense 승인을 위한 `/learn` 투자 가이드 섹션 구현 — 마크다운 기반 10편 콘텐츠 + AdBanner + SVG 일러스트

**Architecture:** `import.meta.glob`으로 `src/content/articles/*.md`를 raw string으로 로드, 커스텀 frontmatter 파서 + `marked`로 처리. React Router v7에 `/learn` + `/learn/:slug` 라우트 추가. AdSense는 이미 `index.html`에 설정되어 있으므로 AdBanner는 `adsbygoogle.push({})` 호출만 담당.

**Tech Stack:** Vite + React 18, React Router v7, `marked` (신규 의존성), Vitest + @testing-library/react

---

## File Map

**신규 생성:**
- `src/utils/articles.js` — frontmatter 파서 + glob 로더
- `src/pages/LearnPage.jsx` — 글 목록 페이지
- `src/pages/ArticlePage.jsx` — 개별 글 뷰어
- `src/components/AdBanner.jsx` — AdSense 배너 래퍼
- `src/components/learn/ArticleIllustration.jsx` — SVG 일러스트 디스패처
- `src/styles/learn.css` — Learn 섹션 스타일
- `src/content/articles/what-is-rebalancing.md`
- `src/content/articles/portfolio-diversification.md`
- `src/content/articles/average-cost-calculation.md`
- `src/content/articles/realized-vs-unrealized-pnl.md`
- `src/content/articles/target-weight-setting.md`
- `src/content/articles/us-stock-for-beginners.md`
- `src/content/articles/exchange-rate-impact.md`
- `src/content/articles/kospi-vs-sp500.md`
- `src/content/articles/us-etf-guide.md`
- `src/content/articles/tax-basics-for-korean-investors.md`
- `src/__tests__/utils/articles.test.js`
- `src/__tests__/components/LearnPage.test.jsx`
- `src/__tests__/components/ArticlePage.test.jsx`

**수정:**
- `src/App.jsx` — `/learn`, `/learn/:slug` 라우트 추가
- `src/components/Sidebar.jsx` — NAV_ITEMS에 투자 가이드 추가
- `src/locales/ko.json` — `sidebar.learn` 키 추가
- `src/locales/en.json` — `sidebar.learn` 키 추가
- `src/index.css` — `@import './styles/learn.css'` 추가 (mobile.css 바로 앞)

---

## Task 1: marked 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: marked 설치**

```bash
npm install marked
```

Expected output: `added 1 package`

- [ ] **Step 2: 설치 확인**

```bash
node -e "import('marked').then(m => console.log(m.marked('# test')))"
```

Expected: `<h1>test</h1>`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add marked for markdown rendering"
```

---

## Task 2: articles.js 유틸리티

**Files:**
- Create: `src/utils/articles.js`
- Test: `src/__tests__/utils/articles.test.js`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/utils/articles.test.js`:

```js
import { parseFrontmatter, readingMinutes } from '../../utils/articles.js'

describe('parseFrontmatter', () => {
  const raw = `---
title: "테스트 글"
slug: "test-article"
date: "2026-06-18"
description: "설명"
---
본문 내용입니다.`

  it('frontmatter 키를 파싱한다', () => {
    const { meta } = parseFrontmatter(raw)
    expect(meta.title).toBe('테스트 글')
    expect(meta.slug).toBe('test-article')
    expect(meta.date).toBe('2026-06-18')
    expect(meta.description).toBe('설명')
  })

  it('본문을 반환한다', () => {
    const { body } = parseFrontmatter(raw)
    expect(body.trim()).toBe('본문 내용입니다.')
  })

  it('frontmatter 없으면 빈 meta와 전체 body 반환', () => {
    const { meta, body } = parseFrontmatter('그냥 텍스트')
    expect(meta).toEqual({})
    expect(body).toBe('그냥 텍스트')
  })
})

describe('readingMinutes', () => {
  it('500자 본문은 1분 반환', () => {
    expect(readingMinutes('가'.repeat(500))).toBe(1)
  })
  it('1500자 본문은 2분 반환', () => {
    expect(readingMinutes('가'.repeat(1500))).toBe(2)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
npx vitest run src/__tests__/utils/articles.test.js
```

Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/utils/articles.js`:

```js
import { marked } from 'marked'

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
  return Math.max(1, Math.ceil(text.length / 700))
}

const rawFiles = import.meta.glob('../content/articles/*.md', { query: '?raw', import: 'default', eager: true })

function buildArticles() {
  return Object.entries(rawFiles)
    .map(([, raw]) => {
      const { meta, body } = parseFrontmatter(raw)
      return {
        title: meta.title ?? '',
        slug: meta.slug ?? '',
        date: meta.date ?? '',
        description: meta.description ?? '',
        minutes: readingMinutes(body),
        html: marked(body),
        body,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

let _cache = null
export function getArticles() {
  if (!_cache) _cache = buildArticles()
  return _cache
}

export function getArticleBySlug(slug) {
  return getArticles().find(a => a.slug === slug) ?? null
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/utils/articles.test.js
```

Expected: PASS (2 describe blocks, 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/articles.js src/__tests__/utils/articles.test.js
git commit -m "feat: articles utility — frontmatter parser + glob loader"
```

---

## Task 3: AdBanner 컴포넌트

**Files:**
- Create: `src/components/AdBanner.jsx`
- Test: `src/__tests__/components/AdBanner.test.jsx`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/components/AdBanner.test.jsx`:

```jsx
import { render } from '@testing-library/react'
import AdBanner from '../../components/AdBanner.jsx'

beforeEach(() => {
  window.adsbygoogle = []
})

it('ins 엘리먼트를 렌더링한다', () => {
  const { container } = render(<AdBanner slot="1234567890" />)
  expect(container.querySelector('ins.adsbygoogle')).toBeTruthy()
})

it('마운트 시 adsbygoogle.push를 호출한다', () => {
  render(<AdBanner slot="1234567890" />)
  expect(window.adsbygoogle.length).toBe(1)
})

it('className prop이 컨테이너에 전달된다', () => {
  const { container } = render(<AdBanner slot="1234567890" className="ad-top" />)
  expect(container.firstChild.classList.contains('ad-top')).toBe(true)
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/__tests__/components/AdBanner.test.jsx
```

Expected: FAIL

- [ ] **Step 3: 구현**

`src/components/AdBanner.jsx`:

```jsx
import { useEffect } from 'react'

export default function AdBanner({ slot, format = 'auto', className = '' }) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (_) {}
  }, [])

  return (
    <div className={`ad-banner-wrap ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9431907803889596"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
```

> **주의:** `data-ad-slot` 값은 AdSense 승인 후 실제 슬롯 ID로 교체해야 합니다. 현재는 더미 값 `"1234567890"` 사용.

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/components/AdBanner.test.jsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AdBanner.jsx src/__tests__/components/AdBanner.test.jsx
git commit -m "feat: AdBanner component for AdSense slots"
```

---

## Task 4: learn.css 스타일 + index.css 등록

**Files:**
- Create: `src/styles/learn.css`
- Modify: `src/index.css`

- [ ] **Step 1: learn.css 생성**

`src/styles/learn.css`:

```css
/* ── Learn 섹션 — 글 목록 & 아티클 뷰어 ── */

.learn-page {
  max-width: 760px;
  margin: 40px auto;
  padding: 0 24px 60px;
}

.learn-page h1 {
  font-family: 'Fraunces', serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -.5px;
  color: var(--ink);
  margin-bottom: 6px;
}

.learn-page h1 .dot { color: var(--gold) }

.learn-tagline {
  font-size: 14px;
  color: var(--ink-dim);
  margin-bottom: 32px;
}

/* 글 목록 카드 */
.article-card {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  text-decoration: none;
  color: inherit;
  transition: border-color .15s;
}

.article-card:hover { border-color: var(--accent) }

.article-card-thumb {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--panel-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.article-card-body { flex: 1; min-width: 0 }

.article-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 6px;
  line-height: 1.4;
}

.article-card-desc {
  font-size: 13px;
  color: var(--ink-dim);
  margin: 0 0 8px;
  line-height: 1.5;
}

.article-card-meta {
  font-size: 12px;
  color: var(--ink-faint);
  font-family: 'Spline Sans Mono', monospace;
}

/* 개별 글 뷰어 */
.article-page {
  max-width: 680px;
  margin: 40px auto;
  padding: 0 24px 60px;
}

.article-hero {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 24px;
  background: var(--panel-2);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.article-header-title {
  font-family: 'Fraunces', serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.35;
  margin: 0 0 8px;
}

.article-meta {
  font-size: 12px;
  color: var(--ink-faint);
  font-family: 'Spline Sans Mono', monospace;
  margin-bottom: 28px;
}

.ad-banner-wrap {
  margin: 24px 0;
  min-height: 90px;
  background: var(--panel-2);
  border-radius: 8px;
  overflow: hidden;
}

/* 마크다운 본문 */
.learn-content { font-size: 14px; line-height: 1.85; color: var(--ink) }
.learn-content h2 {
  font-family: 'Fraunces', serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
  margin: 32px 0 12px;
}
.learn-content h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin: 24px 0 8px;
}
.learn-content p { margin: 0 0 16px }
.learn-content ul, .learn-content ol {
  padding-left: 20px;
  margin: 0 0 16px;
}
.learn-content li { margin-bottom: 6px }
.learn-content strong { color: var(--ink); font-weight: 600 }
.learn-content a { color: var(--accent); text-decoration: none }
.learn-content a:hover { text-decoration: underline }
.learn-content blockquote {
  border-left: 3px solid var(--accent);
  padding: 10px 16px;
  margin: 0 0 16px;
  background: var(--panel-2);
  border-radius: 0 8px 8px 0;
  color: var(--ink-dim);
}

/* 글 하단 네비게이션 */
.article-nav {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.article-nav a {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
}

.article-nav a:hover { text-decoration: underline }

.article-nav-back {
  font-size: 13px;
  color: var(--ink-dim);
  text-align: center;
  flex: 1;
}

/* 모바일 */
@media (max-width: 640px) {
  .article-card { flex-direction: column; gap: 12px }
  .article-card-thumb { width: 100%; height: 120px }
  .article-hero { height: 140px }
}
```

- [ ] **Step 2: index.css에 import 추가 (mobile.css 바로 앞)**

`src/index.css`를 열어 아래처럼 수정:

```css
@import './styles/base.css';
@import './styles/layout.css';
@import './styles/holdings.css';
@import './styles/modal.css';
@import './styles/charts.css';
@import './styles/rebalancing.css';
@import './styles/calendar.css';
@import './styles/news.css';
@import './styles/pages.css';
@import './styles/learn.css';
@import './styles/mobile.css';
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/learn.css src/index.css
git commit -m "feat: learn section styles"
```

---

## Task 5: SVG 일러스트 컴포넌트

**Files:**
- Create: `src/components/learn/ArticleIllustration.jsx`

각 슬러그별 SVG 일러스트를 반환하는 디스패처 컴포넌트입니다.

- [ ] **Step 1: 컴포넌트 생성**

`src/components/learn/ArticleIllustration.jsx`:

```jsx
const illustrations = {
  'what-is-rebalancing': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="48" fill="#1a201d" stroke="#27302c" strokeWidth="2"/>
      {/* 파이 조각 1 (40%) */}
      <path d="M60 60 L60 14 A46 46 0 0 1 100.8 83 Z" fill="#7fd1ae" opacity=".9"/>
      {/* 파이 조각 2 (35%) */}
      <path d="M60 60 L100.8 83 A46 46 0 0 1 22.2 92 Z" fill="#d4b483" opacity=".9"/>
      {/* 파이 조각 3 (25%) */}
      <path d="M60 60 L22.2 92 A46 46 0 0 1 60 14 Z" fill="#5c6660" opacity=".9"/>
      {/* 화살표 재조정 */}
      <path d="M60 34 L66 42 M60 34 L54 42" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'portfolio-diversification': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="70" width="20" height="40" rx="4" fill="#7fd1ae" opacity=".9"/>
      <rect x="35" y="50" width="20" height="60" rx="4" fill="#d4b483" opacity=".9"/>
      <rect x="60" y="30" width="20" height="80" rx="4" fill="#7fd1ae" opacity=".7"/>
      <rect x="85" y="55" width="20" height="55" rx="4" fill="#d4b483" opacity=".7"/>
      <line x1="10" y1="115" x2="110" y2="115" stroke="#27302c" strokeWidth="2"/>
      <path d="M15 65 L45 45 L70 28 L95 50" stroke="#e8654f" strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    </svg>
  ),
  'average-cost-calculation': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="20" x2="15" y2="100" stroke="#27302c" strokeWidth="2"/>
      <line x1="15" y1="100" x2="110" y2="100" stroke="#27302c" strokeWidth="2"/>
      <circle cx="30" cy="80" r="4" fill="#d4b483"/>
      <circle cx="50" cy="60" r="4" fill="#d4b483"/>
      <circle cx="70" cy="40" r="4" fill="#d4b483"/>
      <circle cx="90" cy="55" r="4" fill="#d4b483"/>
      <line x1="20" y1="58" x2="105" y2="58" stroke="#7fd1ae" strokeWidth="1.5" strokeDasharray="5 3"/>
      <text x="108" y="62" fontSize="8" fill="#7fd1ae">avg</text>
    </svg>
  ),
  'realized-vs-unrealized-pnl': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="30" width="40" height="50" rx="6" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <rect x="65" y="30" width="40" height="50" rx="6" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <text x="35" y="58" fontSize="10" fill="#3fbf8f" textAnchor="middle">+12%</text>
      <text x="35" y="72" fontSize="7" fill="#8a958e" textAnchor="middle">평가손익</text>
      <text x="85" y="58" fontSize="10" fill="#d4b483" textAnchor="middle">+8%</text>
      <text x="85" y="72" fontSize="7" fill="#8a958e" textAnchor="middle">실현손익</text>
      <path d="M57 55 L63 55" stroke="#5c6660" strokeWidth="1.5" markerEnd="url(#arr)"/>
    </svg>
  ),
  'target-weight-setting': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="45" stroke="#27302c" strokeWidth="1.5" fill="none"/>
      <circle cx="60" cy="60" r="32" stroke="#7fd1ae" strokeWidth="1.5" fill="none"/>
      <circle cx="60" cy="60" r="16" stroke="#d4b483" strokeWidth="1.5" fill="none"/>
      <circle cx="60" cy="60" r="4" fill="#d4b483"/>
      <line x1="60" y1="15" x2="60" y2="25" stroke="#7fd1ae" strokeWidth="1.5"/>
      <line x1="60" y1="95" x2="60" y2="105" stroke="#7fd1ae" strokeWidth="1.5"/>
    </svg>
  ),
  'us-stock-for-beginners': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="35" width="80" height="55" rx="8" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <text x="60" y="67" fontSize="22" fill="#d4b483" textAnchor="middle" fontFamily="serif">$</text>
      <path d="M25 95 Q60 30 95 95" stroke="#7fd1ae" strokeWidth="1.5" fill="none"/>
      <circle cx="95" cy="95" r="3" fill="#7fd1ae"/>
      <text x="60" y="108" fontSize="7" fill="#8a958e" textAnchor="middle">US STOCK</text>
    </svg>
  ),
  'exchange-rate-impact': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="28" y="58" fontSize="16" fill="#d4b483" textAnchor="middle" fontFamily="serif">₩</text>
      <text x="92" y="58" fontSize="16" fill="#7fd1ae" textAnchor="middle" fontFamily="serif">$</text>
      <path d="M42 50 L62 46 L78 50" stroke="#e9ece9" strokeWidth="1.5" fill="none" markerEnd="url(#a)"/>
      <path d="M78 64 L58 68 L42 64" stroke="#e9ece9" strokeWidth="1.5" fill="none" markerEnd="url(#b)"/>
      <path d="M20 80 Q60 30 100 75" stroke="#5c6660" strokeWidth="1" strokeDasharray="3 3" fill="none"/>
    </svg>
  ),
  'kospi-vs-sp500': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="20" x2="15" y2="100" stroke="#27302c" strokeWidth="2"/>
      <line x1="15" y1="100" x2="110" y2="100" stroke="#27302c" strokeWidth="2"/>
      <polyline points="20,80 40,60 60,65 80,40 100,35" stroke="#7fd1ae" strokeWidth="2" fill="none"/>
      <polyline points="20,85 40,75 60,80 80,65 100,55" stroke="#d4b483" strokeWidth="2" fill="none" strokeDasharray="5 3"/>
      <circle cx="15" cy="97" r="2" fill="#7fd1ae"/>
      <text x="20" y="100" fontSize="6" fill="#7fd1ae">S&amp;P</text>
      <circle cx="45" cy="97" r="2" fill="#d4b483"/>
      <text x="50" y="100" fontSize="6" fill="#d4b483">KOSPI</text>
    </svg>
  ),
  'us-etf-guide': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="25" width="90" height="70" rx="8" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <rect x="25" y="40" width="30" height="16" rx="4" fill="#7fd1ae" opacity=".8"/>
      <rect x="25" y="62" width="30" height="16" rx="4" fill="#d4b483" opacity=".8"/>
      <rect x="63" y="40" width="30" height="16" rx="4" fill="#7fd1ae" opacity=".5"/>
      <rect x="63" y="62" width="30" height="16" rx="4" fill="#d4b483" opacity=".5"/>
      <text x="40" y="52" fontSize="7" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">SPY</text>
      <text x="40" y="74" fontSize="7" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">QQQ</text>
      <text x="78" y="52" fontSize="7" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">SCHD</text>
      <text x="78" y="74" fontSize="6" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">VTI</text>
    </svg>
  ),
  'tax-basics-for-korean-investors': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="20" width="70" height="85" rx="6" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <line x1="35" y1="42" x2="85" y2="42" stroke="#27302c" strokeWidth="1"/>
      <line x1="35" y1="55" x2="85" y2="55" stroke="#27302c" strokeWidth="1"/>
      <line x1="35" y1="68" x2="85" y2="68" stroke="#27302c" strokeWidth="1"/>
      <line x1="35" y1="81" x2="70" y2="81" stroke="#27302c" strokeWidth="1"/>
      <text x="60" y="35" fontSize="8" fill="#d4b483" textAnchor="middle" fontWeight="bold">세금 신고</text>
      <rect x="68" y="72" width="22" height="12" rx="3" fill="#7fd1ae" opacity=".8"/>
      <text x="79" y="81" fontSize="6" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">250만</text>
    </svg>
  ),
}

const DEFAULT_SVG = (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="80" height="80" rx="12" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
    <text x="60" y="68" fontSize="28" fill="#d4b483" textAnchor="middle">📈</text>
  </svg>
)

export default function ArticleIllustration({ slug, size = 72 }) {
  const svg = illustrations[slug] ?? DEFAULT_SVG
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {svg}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learn/ArticleIllustration.jsx
git commit -m "feat: SVG illustrations per article slug"
```

---

## Task 6: LearnPage 컴포넌트

**Files:**
- Create: `src/pages/LearnPage.jsx`
- Test: `src/__tests__/components/LearnPage.test.jsx`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/components/LearnPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../../utils/articles.js', () => ({
  getArticles: () => [
    {
      slug: 'test-1',
      title: '테스트 글 1',
      description: '설명 1',
      date: '2026-06-18',
      minutes: 3,
    },
    {
      slug: 'test-2',
      title: '테스트 글 2',
      description: '설명 2',
      date: '2026-06-17',
      minutes: 5,
    },
  ],
}))

vi.mock('../../components/learn/ArticleIllustration.jsx', () => ({
  default: ({ slug }) => <div data-testid={`illus-${slug}`} />,
}))

vi.mock('../../components/AdBanner.jsx', () => ({
  default: () => <div data-testid="ad-banner" />,
}))

import LearnPage from '../../pages/LearnPage.jsx'

function renderPage() {
  return render(<MemoryRouter><LearnPage /></MemoryRouter>)
}

it('글 목록을 렌더링한다', () => {
  renderPage()
  expect(screen.getByText('테스트 글 1')).toBeInTheDocument()
  expect(screen.getByText('테스트 글 2')).toBeInTheDocument()
})

it('각 카드가 /learn/:slug 링크를 가진다', () => {
  renderPage()
  expect(screen.getByRole('link', { name: /테스트 글 1/ })).toHaveAttribute('href', '/learn/test-1')
})

it('광고 배너를 포함한다', () => {
  renderPage()
  expect(screen.getByTestId('ad-banner')).toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/__tests__/components/LearnPage.test.jsx
```

Expected: FAIL

- [ ] **Step 3: 구현**

`src/pages/LearnPage.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { getArticles } from '../utils/articles.js'
import ArticleIllustration from '../components/learn/ArticleIllustration.jsx'
import AdBanner from '../components/AdBanner.jsx'

export default function LearnPage() {
  const articles = getArticles()

  return (
    <div className="learn-page">
      <h1>투자 가이드<span className="dot">.</span></h1>
      <p className="learn-tagline">한국·미국 주식 투자 실전 지식을 쉽게 정리했습니다</p>

      <AdBanner slot="1234567890" />

      {articles.map(article => (
        <Link
          key={article.slug}
          to={`/learn/${article.slug}`}
          className="article-card"
        >
          <div className="article-card-thumb">
            <ArticleIllustration slug={article.slug} size={72} />
          </div>
          <div className="article-card-body">
            <p className="article-card-title">{article.title}</p>
            <p className="article-card-desc">{article.description}</p>
            <span className="article-card-meta">
              {article.date} · {article.minutes}분
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/components/LearnPage.test.jsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/LearnPage.jsx src/__tests__/components/LearnPage.test.jsx
git commit -m "feat: LearnPage — article list"
```

---

## Task 7: ArticlePage 컴포넌트

**Files:**
- Create: `src/pages/ArticlePage.jsx`
- Test: `src/__tests__/components/ArticlePage.test.jsx`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/components/ArticlePage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../../utils/articles.js', () => ({
  getArticleBySlug: (slug) => slug === 'test-slug' ? {
    slug: 'test-slug',
    title: '테스트 글',
    date: '2026-06-18',
    minutes: 4,
    html: '<p>본문 내용</p>',
  } : null,
  getArticles: () => [],
}))

vi.mock('../../components/learn/ArticleIllustration.jsx', () => ({
  default: () => <div data-testid="illustration" />,
}))

vi.mock('../../components/AdBanner.jsx', () => ({
  default: () => <div data-testid="ad-banner" />,
}))

import ArticlePage from '../../pages/ArticlePage.jsx'

function renderWithSlug(slug) {
  return render(
    <MemoryRouter initialEntries={[`/learn/${slug}`]}>
      <Routes>
        <Route path="/learn/:slug" element={<ArticlePage />} />
      </Routes>
    </MemoryRouter>
  )
}

it('슬러그에 해당하는 글 제목을 렌더링한다', () => {
  renderWithSlug('test-slug')
  expect(screen.getByText('테스트 글')).toBeInTheDocument()
})

it('본문 HTML을 렌더링한다', () => {
  const { container } = renderWithSlug('test-slug')
  expect(container.querySelector('.learn-content p')).toHaveTextContent('본문 내용')
})

it('존재하지 않는 슬러그는 404 메시지를 보여준다', () => {
  renderWithSlug('no-such-slug')
  expect(screen.getByText(/찾을 수 없습니다/)).toBeInTheDocument()
})

it('광고 배너를 포함한다', () => {
  renderWithSlug('test-slug')
  expect(screen.getAllByTestId('ad-banner').length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/__tests__/components/ArticlePage.test.jsx
```

Expected: FAIL

- [ ] **Step 3: 구현**

`src/pages/ArticlePage.jsx`:

```jsx
import { useParams, Link } from 'react-router-dom'
import { getArticleBySlug, getArticles } from '../utils/articles.js'
import ArticleIllustration from '../components/learn/ArticleIllustration.jsx'
import AdBanner from '../components/AdBanner.jsx'

export default function ArticlePage() {
  const { slug } = useParams()
  const article = getArticleBySlug(slug)

  if (!article) {
    return (
      <div className="article-page">
        <p>글을 찾을 수 없습니다.</p>
        <Link to="/learn">← 목록으로</Link>
      </div>
    )
  }

  const all = getArticles()
  const idx = all.findIndex(a => a.slug === slug)
  const prev = all[idx + 1] ?? null
  const next = all[idx - 1] ?? null

  return (
    <div className="article-page">
      <div className="article-hero">
        <ArticleIllustration slug={slug} size={180} />
      </div>

      <h1 className="article-header-title">{article.title}</h1>
      <p className="article-meta">{article.date} · {article.minutes}분 읽기</p>

      <AdBanner slot="1234567891" />

      <div
        className="learn-content"
        dangerouslySetInnerHTML={{ __html: article.html }}
      />

      <AdBanner slot="1234567892" />

      <nav className="article-nav">
        {prev ? <Link to={`/learn/${prev.slug}`}>← {prev.title}</Link> : <span />}
        <Link to="/learn" className="article-nav-back">목록</Link>
        {next ? <Link to={`/learn/${next.slug}`}>{next.title} →</Link> : <span />}
      </nav>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/components/ArticlePage.test.jsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/ArticlePage.jsx src/__tests__/components/ArticlePage.test.jsx
git commit -m "feat: ArticlePage — individual article viewer"
```

---

## Task 8: 라우트 + 사이드바 + i18n 연결

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/locales/ko.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: App.jsx에 라우트 추가**

`src/App.jsx`의 import 블록에 추가:

```jsx
import LearnPage from './pages/LearnPage.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
```

`<Routes>` 내부, `<Route path="*" ...>` 바로 앞에 추가:

```jsx
<Route path="/learn" element={<LearnPage />} />
<Route path="/learn/:slug" element={<ArticlePage />} />
```

- [ ] **Step 2: Sidebar.jsx에 투자 가이드 추가**

`src/components/Sidebar.jsx`의 `NAV_ITEMS` 배열에 항목 추가:

```js
const NAV_ITEMS = [
  { path: '/', key: 'sidebar.dashboard', icon: '📊' },
  { path: '/calendar', key: 'sidebar.calendar', icon: '📅' },
  { path: '/news', key: 'sidebar.news', icon: '📰' },
  { path: '/learn', key: 'sidebar.learn', icon: '📚' },
]
```

- [ ] **Step 3: ko.json에 키 추가**

`src/locales/ko.json`의 `"sidebar"` 객체에 추가:

```json
"learn": "투자 가이드"
```

- [ ] **Step 4: en.json에 키 추가**

`src/locales/en.json`의 `"sidebar"` 객체에 추가:

```json
"learn": "Learn"
```

- [ ] **Step 5: 사이드바 테스트 통과 확인**

```bash
npx vitest run src/__tests__/components/Sidebar.test.jsx
```

Expected: PASS (기존 테스트 모두 통과)

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/Sidebar.jsx src/locales/ko.json src/locales/en.json
git commit -m "feat: wire /learn routes + sidebar nav + i18n keys"
```

---

## Task 9: 콘텐츠 — 실전 가이드 5편

**Files:**
- Create: `src/content/articles/what-is-rebalancing.md`
- Create: `src/content/articles/portfolio-diversification.md`
- Create: `src/content/articles/average-cost-calculation.md`
- Create: `src/content/articles/realized-vs-unrealized-pnl.md`
- Create: `src/content/articles/target-weight-setting.md`

- [ ] **Step 1: what-is-rebalancing.md 작성**

```markdown
---
title: "리밸런싱이란? 언제, 어떻게 해야 할까"
slug: "what-is-rebalancing"
date: "2026-06-18"
description: "포트폴리오 리밸런싱의 개념과 실전 방법을 쉽게 정리했습니다."
---

## 리밸런싱이란 무엇인가

리밸런싱(Rebalancing)은 시간이 지나면서 변해버린 포트폴리오 비중을 원래 목표했던 비율로 되돌리는 작업입니다. 예를 들어 처음에 미국 주식 60%, 한국 주식 40%로 포트폴리오를 구성했다고 가정해봅시다. 미국 주식이 크게 오르면 어느 순간 미국 주식이 75%, 한국 주식이 25%가 되어버릴 수 있습니다. 이때 원래 비율로 되돌리는 것이 리밸런싱입니다.

리밸런싱은 단순히 비율을 맞추는 행위처럼 보이지만, 그 안에는 중요한 투자 원칙이 담겨 있습니다. 많이 오른 자산을 일부 팔고, 덜 오른 자산을 사는 행위는 자연스럽게 "비쌀 때 팔고 쌀 때 산다"는 원칙을 따르게 됩니다.

## 왜 리밸런싱이 필요한가

포트폴리오를 한 번 구성하고 방치하면 시간이 지날수록 특정 자산의 비중이 지나치게 커집니다. 이를 **드리프트(Drift)** 현상이라고 합니다. 드리프트가 심해지면 처음에 설정했던 리스크 수준에서 점점 멀어집니다.

예를 들어 성장주 비중이 60%였던 포트폴리오가 호황기에 80%까지 커지면, 성장주가 급락하는 국면에서 피해가 훨씬 커집니다. 반대로 안전자산 비중이 의도치 않게 높아지면 상승장에서 수익을 충분히 누리지 못합니다. 리밸런싱은 이런 리스크 편향을 주기적으로 교정하는 도구입니다.

## 언제 리밸런싱을 해야 할까

리밸런싱 타이밍에는 크게 두 가지 방식이 있습니다.

**정기 리밸런싱:** 3개월, 6개월, 1년 등 일정한 주기로 실행합니다. 감정적 판단을 배제할 수 있고, 규칙을 세우기 쉽습니다. 개인 투자자에게 가장 현실적인 방법입니다.

**임계값 리밸런싱:** 특정 자산의 비중이 목표에서 5%p 또는 10%p 이상 벗어났을 때 실행합니다. 변동이 적은 시장에서는 불필요한 매매를 줄일 수 있지만, 항상 모니터링해야 하는 번거로움이 있습니다.

두 방식을 조합해서 "분기마다 점검하되, 비중이 10%p 이상 벗어난 자산이 있을 때만 실행한다"는 규칙을 만드는 것도 좋습니다.

## 어떻게 리밸런싱하는가

리밸런싱 실행 방법도 두 가지입니다.

**매도 후 매수:** 비중이 커진 자산을 팔아 현금을 확보하고, 그 돈으로 비중이 줄어든 자산을 삽니다. 가장 직접적인 방법이지만 매도 과정에서 세금(양도소득세)이 발생할 수 있습니다.

**추가 매수만으로 조정:** 새로 입금하는 돈을 비중이 낮아진 자산에만 집중해서 투자합니다. 매도 없이 비중을 서서히 맞출 수 있어 세금 부담을 피할 수 있습니다. 다만 포트폴리오 규모가 크거나 편차가 클 때는 시간이 오래 걸립니다.

## 자주 하는 실수

**너무 자주 리밸런싱:** 매달 리밸런싱하면 거래 비용과 세금이 수익을 갉아먹습니다. 최소 분기, 가급적 반기나 연간 단위를 권장합니다.

**세금을 고려하지 않음:** 한국 투자자의 경우 해외 주식 양도소득에 대한 세금(연 250만 원 기본공제 후 22% 과세)을 고려해야 합니다. 연말에 리밸런싱하면 당해 연도 수익·손실을 함께 계산해 세금을 최적화할 수 있습니다.

**감정에 따른 리밸런싱:** "지금 너무 많이 떨어졌으니 이제 팔겠다"는 식의 판단은 리밸런싱이 아니라 시장 타이밍을 노리는 투기입니다. 사전에 정한 규칙에 따라 기계적으로 실행하는 것이 핵심입니다.

## Ledger에서 리밸런싱 확인하기

Ledger의 대시보드에서 각 종목의 **목표 비중(%)**을 설정하면, 현재 비중과의 차이를 자동으로 계산한 **리밸런싱 가이드**가 표시됩니다. 어떤 종목을 얼마나 사거나 팔아야 목표 비중에 도달하는지 금액 단위로 확인할 수 있습니다. 투자 결정은 항상 본인의 판단에 따라 내리시기 바랍니다.
```

- [ ] **Step 2: portfolio-diversification.md 작성**

```markdown
---
title: "분산 투자의 원칙 — 얼마나 나눠야 할까"
slug: "portfolio-diversification"
date: "2026-06-17"
description: "분산 투자가 왜 필요하고, 어떻게 구현해야 하는지 실전 관점에서 정리합니다."
---

## 달걀을 한 바구니에 담지 말라

"달걀을 한 바구니에 담지 말라"는 격언은 투자에서 분산의 중요성을 가장 간결하게 표현합니다. 분산 투자(Diversification)는 여러 자산에 투자를 나눔으로써 한 자산의 폭락이 전체 포트폴리오에 미치는 충격을 줄이는 전략입니다.

그러나 많은 투자자가 분산을 오해합니다. 삼성전자, SK하이닉스, 현대차에 나눠 투자했다고 충분히 분산되었다고 생각하는 것이 대표적입니다. 세 종목 모두 한국 경기에 민감하게 반응하기 때문에, 한국 경제가 흔들릴 때는 셋이 동시에 하락합니다.

## 진짜 분산이란

진정한 분산은 **서로 다르게 움직이는 자산에 나누는 것**입니다. 이를 상관관계(Correlation)가 낮다고 표현합니다. 상관관계가 낮을수록 한 자산이 오를 때 다른 자산이 반드시 오르지는 않는다는 뜻입니다.

효과적인 분산의 축은 여러 가지입니다.

**지역 분산:** 한국 주식과 미국 주식은 장기적으로 완전히 같은 방향으로 움직이지 않습니다. 미국 경기가 좋아도 한국 수출 상황에 따라 한국 증시가 소외될 수 있고, 반대 경우도 마찬가지입니다.

**섹터 분산:** 기술주, 금융주, 헬스케어, 소비재 등 서로 다른 산업에 나눠 투자합니다. IT 버블 붕괴처럼 특정 섹터가 폭락할 때 다른 섹터가 완충 역할을 합니다.

**자산군 분산:** 주식 외에도 채권, 현금, 원자재(금) 등을 포함하면 변동성을 더 낮출 수 있습니다. 주식 시장이 폭락할 때 채권이나 금은 반대로 오르는 경향이 있기 때문입니다.

## 종목 수가 많아야 분산인가

종목 수와 분산은 같은 개념이 아닙니다. 같은 섹터 내 종목을 30개 모으는 것보다 서로 다른 특성을 가진 5개 종목이 분산 효과가 더 클 수 있습니다.

학술 연구에 따르면 무작위로 선택한 종목을 늘릴 경우, 15~20개 종목 이후로는 추가 분산 효과가 급격히 줄어듭니다. 개인 투자자라면 10~15개 종목에 집중하고 지역·섹터 다양성을 확보하는 것이 현실적입니다.

## ETF로 간편하게 분산하기

분산 투자를 가장 쉽게 실천하는 방법은 ETF(상장지수펀드)를 활용하는 것입니다. SPY 하나를 사면 미국 대형주 500개에 동시에 투자하는 효과를 얻습니다. KOSPI200을 추종하는 ETF 하나로 국내 대형주 200개에 분산됩니다.

ETF를 몇 개 조합하면 어렵지 않게 글로벌 분산 포트폴리오를 만들 수 있습니다.

- 미국 전체 주식시장: VTI 또는 SPY
- 미국 기술주: QQQ
- 미국 배당주: SCHD
- 국내 대형주: KODEX 200

## 과도한 분산의 위험

분산이 무조건 좋은 것은 아닙니다. 너무 많은 자산에 조금씩 투자하면 어떤 종목이 크게 올라도 포트폴리오 전체에 미치는 영향이 미미합니다. 이를 "디워스피케이션(Diworsification)"이라고 부르기도 합니다.

투자 철학이 명확하고 충분한 공부가 된 종목이라면 집중 투자도 선택지입니다. 다만 집중 투자는 손실도 집중된다는 점을 항상 염두에 둬야 합니다.

## 나에게 맞는 분산 수준 찾기

분산의 적정 수준은 투자자의 시간, 자금 규모, 리스크 허용 범위에 따라 다릅니다. 투자에 많은 시간을 쓰기 어렵다면 ETF 중심의 폭넓은 분산이, 종목 선정에 자신 있다면 좀 더 집중된 포트폴리오가 맞을 수 있습니다. 중요한 것은 나의 기준을 먼저 세우고, 그 기준에 맞게 일관성 있게 유지하는 것입니다.
```

- [ ] **Step 3: average-cost-calculation.md 작성**

```markdown
---
title: "평균 매수가 계산법과 물타기의 진실"
slug: "average-cost-calculation"
date: "2026-06-16"
description: "평균 매수가를 정확히 계산하는 방법과 물타기의 수학적 진실을 알아봅니다."
---

## 평균 매수가란 무엇인가

주식을 여러 번에 나눠 살 때, 각 매수의 평균을 낸 가격을 **평균 매수가(Average Cost)** 또는 **평균단가**라고 합니다. 포트폴리오가 수익인지 손실인지 판단하는 기준이 되는 핵심 숫자입니다.

계산 방법은 간단합니다.

```
평균 매수가 = 총 투자금액 / 총 보유 수량
```

예시로 설명하면, A 종목을 10주 × 10만 원(100만 원)에 샀고, 나중에 추가로 10주 × 8만 원(80만 원)에 샀다면 총 투자금은 180만 원, 총 수량은 20주이므로 평균 매수가는 9만 원입니다.

## 매도 시 평균 매수가 변화

주의해야 할 점은 매도가 발생했을 때입니다. 일부를 팔면 남은 수량에 대한 평균 매수가는 변하지 않습니다. 팔 때는 보유 중인 주식을 평균 매수가 기준으로 파는 것으로 처리하기 때문입니다.

예를 들어 평균 매수가 9만 원인 20주 중 10주를 12만 원에 팔면, 남은 10주의 평균 매수가는 여전히 9만 원입니다. 실현손익은 (12만 - 9만) × 10주 = 30만 원이 됩니다.

## 물타기의 수학

**물타기**는 주가가 하락했을 때 추가 매수해 평균 매수가를 낮추는 전략입니다. 이 전략에는 착시 효과가 있어서 신중하게 이해할 필요가 있습니다.

예를 들어 1만 원에 100주(100만 원)를 매수한 후 주가가 7,000원으로 떨어졌다고 합시다. 7,000원에 100주(70만 원)를 추가 매수하면 평균 매수가는 8,500원이 됩니다. "평단이 낮아졌으니 손익분기점이 낮아졌다"는 생각이 드지만, 여기엔 함정이 있습니다.

첫째, **추가 투자금이 들어간다는 사실**을 간과하기 쉽습니다. 손익분기점은 낮아졌지만 위험에 노출된 총자금은 170만 원으로 늘었습니다.

둘째, **주가 회복 가능성을 과신**하는 경향이 있습니다. 주가가 하락한 데는 이유가 있습니다. 그 이유가 일시적인지 구조적인지 파악하지 않고 물타기를 반복하면 손실이 눈덩이처럼 커집니다.

## 언제 추가 매수가 타당한가

물타기 자체가 나쁜 것은 아닙니다. 다만 조건이 있습니다.

**하락 이유가 시장 전체의 문제일 때:** 해당 종목의 펀더멘털(실적, 사업 모델, 경쟁력)은 변하지 않았는데 시장 전체가 흔들려 주가가 내려간 경우라면, 추가 매수는 합리적입니다.

**여유 자금이 있을 때:** 이미 가진 주식의 손실을 만회하기 위해 비상금이나 대출을 동원하는 것은 위험합니다. 추가 매수는 여유 자금 범위 내에서만 해야 합니다.

**미리 계획된 분할 매수일 때:** 처음부터 "이 종목에 3번에 나눠 투자하겠다"고 계획했다면 두 번째, 세 번째 매수는 물타기가 아니라 예정된 분할 매수입니다.

## Ledger에서 평균 매수가 확인

Ledger는 거래 이력을 기반으로 종목별 평균 매수가를 자동 계산합니다. 매수와 매도를 모두 입력하면 정확한 평균 매수가와 실현손익을 실시간으로 확인할 수 있습니다. 거래를 빠짐없이 기록하는 것이 정확한 계산의 전제조건입니다.
```

- [ ] **Step 4: realized-vs-unrealized-pnl.md 작성**

```markdown
---
title: "실현손익 vs 평가손익, 뭐가 다를까"
slug: "realized-vs-unrealized-pnl"
date: "2026-06-15"
description: "실현손익과 평가손익의 차이, 세금과의 관계, 그리고 흔한 심리적 함정을 정리합니다."
---

## 두 개념의 기본 차이

투자 손익에는 두 가지 종류가 있습니다.

**평가손익(Unrealized P&L):** 현재 보유 중인 주식의 현재 가격과 매수가의 차이입니다. 아직 팔지 않았기 때문에 "장부상" 이익이나 손실입니다. 주가가 변할 때마다 실시간으로 달라집니다.

**실현손익(Realized P&L):** 실제로 주식을 팔아서 확정된 이익이나 손실입니다. 매도를 완료하는 순간 금액이 확정되고, 이후 주가가 어떻게 변하든 영향을 받지 않습니다.

간단한 예를 들면, 10만 원에 산 주식이 현재 13만 원이라면 평가손익은 +3만 원입니다. 이 주식을 13만 원에 팔면 실현손익 +3만 원이 됩니다. 팔기 전에는 숫자가 아무리 커도 실제로 내 손에 들어온 돈은 없습니다.

## 세금에서의 의미

한국 투자자에게 이 구분이 중요한 이유는 **세금이 실현손익 기준으로 매겨지기 때문**입니다.

해외 주식 양도소득세는 주식을 팔아서 확정된 이익(실현손익)에 대해 부과됩니다. 평가손익이 아무리 크더라도 팔지 않으면 세금이 발생하지 않습니다.

반면 배당금은 받는 즉시 배당소득세(15.4%)가 원천징수됩니다. 배당금은 지급되는 순간 실현되기 때문입니다.

연간 해외 주식 양도차익이 250만 원 이하면 세금이 없습니다. 250만 원을 초과하는 금액에 대해서만 22%(지방소득세 포함)가 부과됩니다. 따라서 연말에 전략적으로 일부 주식을 팔아 실현손익을 250만 원 이하로 조정하면 절세가 가능합니다.

## 손실 종목을 함께 활용하는 절세 전략

실현손익 개념을 활용한 절세 전략 중 가장 기본적인 것은 **손익 상계**입니다. 같은 해에 실현이익이 있다면, 보유 중인 손실 종목을 함께 매도해서 실현이익을 줄일 수 있습니다.

예를 들어 A 종목에서 실현이익이 500만 원, B 종목의 평가손실이 300만 원이라면, B 종목을 팔아 300만 원의 실현손실을 만들면 순 실현이익은 200만 원이 됩니다. 기본공제 250만 원 이하이므로 세금이 없어집니다.

단, B 종목을 팔았다가 바로 다시 사는 행위는 가능하지만, 매도 후 재매수 시점의 주가 변동 리스크가 있습니다.

## 평가손익에 관한 심리적 함정

평가손익은 심리적으로 투자자를 자주 흔들어 놓습니다.

**이익 실현 조급증:** 평가이익이 생기면 "지금 팔아서 확정해야 한다"는 충동이 생깁니다. 하지만 좋은 종목을 너무 일찍 파는 것은 장기 수익을 갉아먹는 주요 원인입니다.

**손실 회피 편향:** 평가손실 상태에서는 "팔면 손실이 확정된다"는 생각에 손절을 미룹니다. 그 사이 손실이 더 커지는 경우가 많습니다.

올바른 태도는 평가손익이 아닌 **해당 종목의 현재 가치와 미래 전망**을 기준으로 매도 여부를 결정하는 것입니다. "지금 이 종목을 처음 보는 신규 투자자라면 현재 가격에 살 것인가?" 라는 질문을 스스로에게 던져보는 것이 도움이 됩니다.

## Ledger에서 손익 확인

Ledger 헤더에는 **평가손익**과 **실현손익**이 분리되어 표시됩니다. 거래 이력에 매도 내역을 입력하면 실현손익이 자동으로 계산됩니다. 두 숫자를 모두 파악해야 포트폴리오의 전체적인 성과를 정확히 알 수 있습니다.
```

- [ ] **Step 5: target-weight-setting.md 작성**

```markdown
---
title: "포트폴리오 목표 비중 설정하는 법"
slug: "target-weight-setting"
date: "2026-06-14"
description: "종목별 목표 비중을 설정하고 리밸런싱 기준으로 활용하는 방법을 안내합니다."
---

## 목표 비중이란

목표 비중(Target Weight)은 각 자산이 포트폴리오 전체에서 차지해야 할 이상적인 비율입니다. 예를 들어 "애플 20%, 삼성전자 15%, 미국 ETF 40%, 현금 25%"와 같이 설정합니다. 목표 비중은 포트폴리오의 나침반 역할을 합니다. 시장이 흔들려도 목표를 기준으로 판단할 수 있기 때문에 감정적 매매를 줄이는 데 도움이 됩니다.

목표 비중이 없으면 리밸런싱도 할 수 없습니다. "얼마나 샀을 때 팔아야 하는지"의 기준이 없기 때문입니다.

## 목표 비중을 어떻게 설정하는가

목표 비중 설정에는 정해진 공식이 없습니다. 그러나 몇 가지 기준을 활용하면 출발점을 잡을 수 있습니다.

**리스크 허용 범위:** 포트폴리오가 30% 하락해도 심리적으로 버틸 수 있다면 주식 비중을 높게 가져갈 수 있습니다. 10% 하락에도 잠이 안 온다면 주식 비중을 줄이고 안전자산을 늘려야 합니다. 자신의 리스크 허용 범위를 먼저 파악하는 것이 출발점입니다.

**투자 기간:** 10년 이상 장기 투자라면 단기 변동을 견딜 수 있으므로 주식 비중을 높여도 됩니다. 3~5년 내에 필요한 자금이라면 안전자산 비중을 높여야 합니다.

**나이 기반 공식:** 고전적인 방법으로 "주식 비중 = 100 - 나이"가 있습니다. 30세라면 주식 70%, 안전자산 30%. 최근에는 기대수명 증가로 "110 - 나이"를 쓰기도 합니다. 절대 공식은 아니지만, 초보 투자자의 출발점으로 활용하기 좋습니다.

## 종목별 비중의 상한선

개별 종목에 지나치게 편중되는 것을 막기 위해 단일 종목 상한선을 두는 것이 좋습니다. 보편적으로 사용하는 기준은 다음과 같습니다.

- 개별 종목: 전체의 20~25% 이하
- 단일 섹터: 전체의 30~40% 이하
- 단일 국가(미국 또는 한국): 전체의 60~70% 이하

이 숫자들은 절대적인 기준이 아니라 하나의 가이드라인입니다. 특정 종목에 확신이 강하다면 상한을 높게 잡을 수 있지만, 그만큼 리스크도 집중된다는 점을 인식해야 합니다.

## 목표 비중은 바뀔 수 있다

처음 설정한 목표 비중을 영원히 유지할 필요는 없습니다. 인생 상황이 바뀌면 목표 비중도 바꿔야 합니다.

결혼, 내 집 마련, 은퇴 준비 등 재정적 목표가 가까워지면 리스크를 줄여야 합니다. 반대로 소득이 늘거나 부채가 줄어 재정 안정성이 높아졌다면 주식 비중을 높이는 것도 합리적입니다.

다만 시장 상황에 따라 목표 비중을 자주 바꾸는 것은 피해야 합니다. "주식이 많이 올랐으니 목표 비중을 높이겠다"는 식의 결정은 꼭지에서 비중을 늘리는 실수로 이어질 수 있습니다.

## 현금도 비중이다

현금을 그냥 놀리는 돈으로 생각하기 쉽지만, 현금도 포트폴리오의 일부입니다. 현금은 기회가 왔을 때 신속하게 투자할 수 있는 여력(드라이 파우더)이기도 합니다.

특히 시장 변동성이 클 때 현금 비중을 일정 수준 유지하면, 급락 시 추가 매수 기회를 잡을 수 있습니다. 총 포트폴리오의 5~20% 정도를 현금으로 유지하는 것이 일반적입니다.

## Ledger에서 목표 비중 설정

Ledger에서는 각 종목의 수정(✎) 버튼을 눌러 목표 비중(%)을 입력할 수 있습니다. 현금 잔액도 함께 입력하면 전체 자산 대비 정확한 비중이 계산됩니다. 목표 합계가 100%가 되도록 설정하면 리밸런싱 가이드에서 각 종목을 얼마나 사고 팔아야 하는지 금액으로 확인할 수 있습니다.
```

- [ ] **Step 6: Commit**

```bash
git add src/content/articles/
git commit -m "content: 실전 가이드 5편 추가 (리밸런싱·분산·평단·손익·목표비중)"
```

---

## Task 10: 콘텐츠 — 서학개미 5편

**Files:**
- Create: `src/content/articles/us-stock-for-beginners.md`
- Create: `src/content/articles/exchange-rate-impact.md`
- Create: `src/content/articles/kospi-vs-sp500.md`
- Create: `src/content/articles/us-etf-guide.md`
- Create: `src/content/articles/tax-basics-for-korean-investors.md`

- [ ] **Step 1: us-stock-for-beginners.md 작성**

```markdown
---
title: "서학개미 입문 — 미국 주식 처음 시작하기"
slug: "us-stock-for-beginners"
date: "2026-06-13"
description: "미국 주식 투자를 처음 시작하는 한국 투자자를 위한 기초 가이드입니다."
---

## 왜 미국 주식인가

"서학개미"는 해외 주식, 특히 미국 주식에 투자하는 한국 개인 투자자를 가리키는 말입니다. 2020년 이후 국내 투자자들의 해외 주식 투자가 폭발적으로 늘어나면서 생겨난 표현입니다.

미국 주식이 주목받는 이유는 분명합니다. 미국은 세계 최대의 자본 시장이며, 애플, 마이크로소프트, 엔비디아 같은 글로벌 혁신 기업들이 상장되어 있습니다. 미국 S&P500 지수는 장기적으로 연평균 10% 내외의 수익률을 기록해 왔습니다. 한국 증시가 "박스피(KOSPI가 박스권에 갇혀 있다)"라고 불리며 부진했던 시기에도 미국 증시는 꾸준히 상승했습니다.

또한 달러 자산을 보유한다는 것 자체가 원화 약세 리스크에 대한 헤지가 됩니다. 원화가 약세일 때는 달러 자산의 원화 환산 가치가 올라가기 때문입니다.

## 계좌 개설과 환전

미국 주식을 사려면 증권사에서 해외 주식 거래가 가능한 계좌를 개설해야 합니다. 국내 대부분의 증권사(키움증권, 미래에셋, 삼성증권, NH투자증권 등)에서 가능합니다. 온라인·비대면 개설이 보편화되어 몇 시간 내에 완료됩니다.

계좌 개설 후 원화를 달러로 환전해야 합니다. 환전 시 고려할 점은 두 가지입니다.

**환율 타이밍:** 환율이 낮을 때 환전하면 더 많은 달러를 받을 수 있습니다. 그러나 환율 예측은 어렵습니다. 분할 환전을 통해 환율 리스크를 분산하는 것이 현실적입니다.

**환전 수수료:** 증권사마다 환전 수수료가 다릅니다. 보통 환율 스프레드(매도환율과 매수환율의 차이) 형태로 부과됩니다. 환전 우대율을 제공하는 이벤트를 활용하면 수수료를 줄일 수 있습니다.

## 꼭 알아야 할 기본 용어

**티커(Ticker):** 주식 거래에 사용되는 고유 코드입니다. 애플은 AAPL, 마이크로소프트는 MSFT, 테슬라는 TSLA입니다.

**ETF(Exchange Traded Fund):** 여러 종목을 묶어 하나처럼 거래할 수 있도록 만든 상품입니다. SPY는 S&P500 500개 기업에 동시에 투자하는 효과를 냅니다.

**배당(Dividend):** 기업이 이익의 일부를 주주에게 현금으로 나눠주는 것입니다. 미국 기업 중에는 매 분기 배당을 지급하는 곳이 많습니다.

**P/E Ratio(주가수익비율):** 주가를 주당순이익(EPS)으로 나눈 값입니다. 높을수록 미래 성장에 대한 기대가 큰 것으로, 낮을수록 저평가 가능성이 있는 것으로 해석합니다.

**52주 최고·최저가:** 최근 1년간 기록한 가장 높은 가격과 낮은 가격입니다. 현재 주가가 어느 위치에 있는지 가늠하는 데 활용합니다.

## 첫 종목, 무엇부터 살까

처음 미국 주식을 살 때는 개별 종목보다 ETF부터 시작하는 것을 추천합니다. 개별 종목은 기업 분석, 실적 모니터링 등 많은 시간과 공부가 필요합니다. 반면 S&P500 ETF(SPY, IVV, VOO 중 하나)는 미국 경제 전체에 베팅하는 개념이어서 장기적으로 안정적인 결과를 기대할 수 있습니다.

첫 투자는 여유 자금의 일부로, 잃어도 생활에 영향이 없는 금액부터 시작하세요. 주식 투자는 경험을 쌓으면서 실력이 늘어나는 영역입니다.
```

- [ ] **Step 2: exchange-rate-impact.md 작성**

```markdown
---
title: "환율이 내 포트폴리오에 미치는 영향"
slug: "exchange-rate-impact"
date: "2026-06-12"
description: "달러-원 환율 변동이 해외 주식 수익률에 어떤 영향을 주는지 정리합니다."
---

## 해외 투자와 환율의 관계

미국 주식에 투자한다는 것은 두 가지 리스크를 동시에 안는다는 뜻입니다. 첫 번째는 주가 변동 리스크, 두 번째는 환율 변동 리스크입니다. 미국 주식 수익률이 아무리 좋아도, 달러 가치가 급락하면 원화 기준 수익률은 크게 줄어들 수 있습니다.

반대로 주식 자체의 수익률이 낮아도 달러가 강세가 되면 원화 기준 수익률이 오를 수 있습니다. 환율은 해외 투자에서 무시할 수 없는 변수입니다.

## 달러 강세 vs 원화 강세

**달러 강세(원화 약세):** 1달러에 1,200원이던 환율이 1,400원으로 오르면 달러 강세입니다. 이 경우 미국 주식을 원화로 환산한 가치가 올라갑니다. 주가가 동일해도 원화 기준 가치가 높아지는 효과가 납니다.

예시: 주가가 $100로 동일해도, 환율이 1,200원일 때는 12만 원, 1,400원일 때는 14만 원으로 17% 차이가 납니다.

**달러 약세(원화 강세):** 반대로 환율이 1,400원에서 1,200원으로 내리면 달러 자산의 원화 가치가 하락합니다. 미국 주식이 10% 올라도 달러가 15% 약세가 되면 원화 기준으로는 손실이 됩니다.

## 환율 변동이 큰 시기는 언제인가

달러는 글로벌 안전자산으로 인식됩니다. 경기 불안, 전쟁, 금융위기 등 리스크가 커질 때 달러가 강해지는 경향이 있습니다. 이런 시기에는 주식 시장이 하락하지만 달러 강세 효과로 원화 기준 손실이 완화되기도 합니다.

반대로 글로벌 경기가 좋고 위험 선호가 높아질 때는 달러가 약세가 되고 신흥국 통화(원화 포함)가 강세가 되는 경향이 있습니다. 이때는 미국 주식 수익률이 좋아도 환율 영향으로 원화 기준 수익이 줄어들 수 있습니다.

## 환헤지란 무엇인가

환헤지(Currency Hedge)는 환율 변동 리스크를 제거하는 금융 기법입니다. 국내에 상장된 일부 해외 ETF 중에는 "환헤지형"과 "환노출형(언헤지)"이 있습니다.

**환헤지형:** 환율 변동을 제거해 순수하게 주가 변동만 수익에 반영됩니다. 달러 강세 국면에서는 환헤지형의 수익률이 낮아집니다.

**환노출형(환헤지 없음):** 환율 변동이 그대로 수익에 반영됩니다. 달러 강세 시 추가 이익, 달러 약세 시 추가 손실이 발생합니다.

장기 투자 관점에서는 환헤지 비용(연 0.5~2% 내외)을 감수하기보다 환노출 상태로 투자하는 것이 일반적으로 유리하다는 연구 결과가 많습니다. 그러나 환율 변동성이 크고 단기 투자인 경우 환헤지가 안정적일 수 있습니다.

## 실용적인 접근법

환율 예측은 전문가도 어렵습니다. 개인 투자자에게 현실적인 접근법은 다음과 같습니다.

**분할 환전:** 한 번에 모두 환전하지 말고 시기를 나눠 환전합니다. 환율의 평균 비용을 낮추는 효과가 있습니다.

**장기 투자:** 장기적으로 보면 환율 변동이 수익률에 미치는 영향은 줄어듭니다. 단기 등락에 일희일비하지 않는 것이 중요합니다.

**원화 기준으로 계산:** 해외 주식의 수익률을 항상 원화 기준으로 체크하는 습관을 들이세요. Ledger는 달러와 원화 기준을 토글로 전환해 확인할 수 있습니다.
```

- [ ] **Step 3: kospi-vs-sp500.md 작성**

```markdown
---
title: "KOSPI vs S&P500 — 두 시장의 차이와 배분 전략"
slug: "kospi-vs-sp500"
date: "2026-06-11"
description: "한국과 미국 주식 시장의 특성을 비교하고, 두 시장에 적절히 배분하는 방법을 알아봅니다."
---

## 두 시장의 기본 특성

**KOSPI(한국종합주가지수)**는 한국거래소에 상장된 모든 기업의 시가총액을 합산한 지수입니다. 삼성전자, SK하이닉스, 현대차, LG에너지솔루션 같은 대형 제조업 중심입니다. 한국 경제의 수출 의존도가 높기 때문에 글로벌 경기, 반도체 사이클, 달러-원 환율의 영향을 강하게 받습니다.

**S&P500**은 미국 뉴욕증권거래소와 나스닥에 상장된 대형주 500개를 시가총액 기준으로 편입한 지수입니다. 애플, 마이크로소프트, 아마존, 엔비디아 같은 글로벌 플랫폼·기술 기업이 상위 비중을 차지합니다. 미국 내수 경제는 물론 글로벌 경제 전반의 영향을 받습니다.

## 수익률 비교

장기 수익률 면에서 S&P500이 KOSPI를 크게 앞섭니다. 2010년부터 2024년까지 S&P500의 누적 수익률은 약 400~500%에 달했으나, KOSPI는 같은 기간 100%에도 미치지 못했습니다.

이 차이의 주요 원인은 구성 기업의 차이입니다. S&P500에는 세계 시장을 장악한 플랫폼 기업들이 많아 이익 성장이 꾸준했습니다. KOSPI는 반도체를 제외하면 구조적 성장이 약한 기업이 많고, 코리아 디스카운트(한국 증시 저평가 현상)도 만성적 문제로 지적됩니다.

그러나 특정 구간에서는 KOSPI가 앞설 때도 있습니다. 2020년 코로나 반등 국면에서 반도체·전기차 배터리 강세로 KOSPI가 단기에 급등한 사례가 있습니다.

## 상관관계와 분산 효과

두 지수는 완전히 같은 방향으로 움직이지는 않습니다. 글로벌 경기 침체 국면에서는 동반 하락하는 경향이 있지만, 평상시에는 다른 요인에 의해 움직이는 경우가 많습니다.

이 때문에 두 시장에 분산 투자하면 어느 정도의 리스크 완화 효과를 기대할 수 있습니다. 미국 기술주 조정기에 한국 배당주가 선방하거나, 달러 약세 시 원화 자산이 상대적으로 강세를 보이는 식입니다.

## 어떻게 배분할 것인가

정해진 정답은 없지만, 한국 투자자의 현실을 고려한 몇 가지 가이드라인입니다.

**소득 원천 고려:** 한국에서 원화 소득이 있다면 자산을 달러로 분산하는 것이 자연스러운 헤지입니다. 미국 비중을 높여도 됩니다.

**일반적인 출발점:** 미국(S&P500 ETF) 50~60%, 한국 20~30%, 현금 10~20%를 기본 틀로 잡고 조정합니다.

**한국 시장의 역할:** 한국 대형 배당주(금융, 통신 등)는 비교적 낮은 밸류에이션과 배당수익률 면에서 포트폴리오 안정화 역할을 할 수 있습니다.

결국 두 시장을 모두 보유하는 것이 지역 편중 리스크를 줄이는 가장 효율적인 방법입니다. 어느 쪽이 더 좋은지 판단하기보다 두 시장의 특성을 이해하고 각자의 목적에 맞게 배분하는 것이 핵심입니다.
```

- [ ] **Step 4: us-etf-guide.md 작성**

```markdown
---
title: "미국 ETF 종류 가이드 — SPY, QQQ, SCHD 비교"
slug: "us-etf-guide"
date: "2026-06-10"
description: "대표적인 미국 ETF의 특성을 비교하고 자신에게 맞는 ETF를 고르는 방법을 안내합니다."
---

## ETF란 무엇인가

ETF(Exchange Traded Fund, 상장지수펀드)는 특정 지수나 자산군을 추종하도록 설계된 펀드를 주식처럼 거래소에서 사고팔 수 있게 만든 상품입니다. 펀드처럼 여러 종목에 자동으로 분산되고, 주식처럼 실시간으로 거래할 수 있다는 것이 장점입니다.

일반 주식형 펀드와 달리 ETF는 낮은 운용 보수, 높은 투명성, 쉬운 거래라는 장점을 가집니다. 미국의 Vanguard, iShares, SPDR 같은 운용사가 대표적이며, 수천 종류의 ETF가 미국 거래소에 상장되어 있습니다.

## SPY — 가장 오래된 S&P500 ETF

**SPDR S&P500 ETF Trust(SPY)**는 1993년 출시된 세계 최초의 ETF입니다. S&P500 지수를 추종하며, 미국 대형주 500개에 자동으로 분산 투자됩니다.

- 운용 보수: 연 0.0945%
- 배당 수익률: 약 1.2~1.5%
- 특징: 세계에서 가장 거래량이 많은 ETF 중 하나. 유동성이 매우 높아 언제든 매매 가능.

SPY와 비슷한 역할을 하는 ETF로 Vanguard의 VOO(보수 0.03%)와 iShares의 IVV(보수 0.03%)가 있습니다. 세 ETF는 거의 동일한 수익률을 보이지만 보수 면에서 VOO·IVV가 더 유리합니다.

## QQQ — 기술주 집중 ETF

**Invesco QQQ Trust(QQQ)**는 나스닥100 지수를 추종합니다. 나스닥에 상장된 상위 100개 비금융 기업에 투자하며, 애플·마이크로소프트·엔비디아·아마존·알파벳 등 기술 대형주 비중이 높습니다.

- 운용 보수: 연 0.20%
- 배당 수익률: 약 0.5~0.8%
- 특징: 기술주 성장에 집중. S&P500 대비 변동성이 크고, 상승장에서 수익률이 높지만 하락장에서 낙폭도 큼.

장기 수익률 면에서 QQQ는 SPY를 앞선 기간이 많지만, 2000년 닷컴 버블 붕괴처럼 기술주가 집중 타격을 받을 때는 80% 이상 하락한 사례도 있습니다.

## SCHD — 배당 성장 ETF

**Schwab US Dividend Equity ETF(SCHD)**는 미국 우량 배당주에 투자합니다. 10년 이상 배당을 꾸준히 늘려온 기업, 높은 배당 수익률, 건강한 재무 상태를 기준으로 종목을 선정합니다.

- 운용 보수: 연 0.06%
- 배당 수익률: 약 3.5~4%
- 특징: 배당 소득을 중시하는 투자자에게 적합. 기술주보다 변동성이 낮고, 경기 방어적 성격.

SCHD는 성장보다 배당 소득이 중요한 투자자, 또는 포트폴리오의 안정성을 높이고 싶은 투자자에게 인기가 높습니다. SPY·QQQ와 함께 보유하면 성장과 소득의 균형을 맞출 수 있습니다.

## VTI — 미국 전체 시장 ETF

**Vanguard Total Stock Market ETF(VTI)**는 미국 전체 주식 시장, 즉 대형주부터 소형주까지 약 3,800개 종목을 포함합니다.

- 운용 보수: 연 0.03%
- 배당 수익률: 약 1.3~1.6%
- 특징: S&P500보다 넓은 분산. 중소형주 성장 가능성도 포함.

## 어떤 ETF를 선택할까

**처음 시작한다면:** VOO 또는 VTI 하나로 시작합니다. 가장 낮은 보수로 가장 넓은 분산을 제공합니다.

**성장을 원한다면:** QQQ를 일부 추가합니다. 다만 변동성이 높다는 점을 감수해야 합니다.

**배당 소득을 원한다면:** SCHD를 포함합니다. 매 분기 배당이 지급되어 현금 흐름이 생깁니다.

**조합 예시:** VOO 50% + QQQ 30% + SCHD 20%는 성장과 배당의 균형을 맞추는 방식으로 많은 투자자가 활용합니다.

ETF는 투자 철학을 단순화하고 운용 비용을 낮추는 강력한 도구입니다. 복잡한 종목 분석 없이 시장 전체에 참여하는 방법으로, 장기 투자의 첫걸음으로 최적의 선택입니다.
```

- [ ] **Step 5: tax-basics-for-korean-investors.md 작성**

```markdown
---
title: "서학개미가 꼭 알아야 할 해외 주식 세금 기초"
slug: "tax-basics-for-korean-investors"
date: "2026-06-09"
description: "해외 주식 양도소득세, 기본공제, 배당소득세, 절세 전략을 쉽게 정리합니다."
---

## 해외 주식에는 어떤 세금이 붙나

한국에서 해외 주식에 투자할 때 발생하는 세금은 크게 두 가지입니다. **양도소득세**와 **배당소득세**입니다.

국내 주식(코스피·코스닥)의 소액 주주는 양도소득세가 면제되지만, 해외 주식은 금액 규모와 무관하게 양도소득세 신고 의무가 있습니다. 이 점이 해외 주식 투자자가 반드시 알아야 할 가장 중요한 차이점입니다.

## 양도소득세 구조

해외 주식 양도소득세의 핵심은 다음과 같습니다.

**기본공제 250만 원:** 연간 해외 주식 양도차익의 합계가 250만 원 이하면 세금이 없습니다. 250만 원을 초과하는 금액에 대해서만 세금이 부과됩니다.

**세율:** 초과분의 22%(양도소득세 20% + 지방소득세 2%)입니다.

예를 들어 2026년 한 해 동안 미국 주식을 팔아 400만 원의 이익을 실현했다면, 250만 원 기본공제를 제하고 남은 150만 원에 대해 22%인 33만 원을 세금으로 내야 합니다.

손실이 있다면 이익과 상계할 수 있습니다. 같은 해 A 종목에서 500만 원 이익, B 종목에서 200만 원 손실이 발생했다면 순이익은 300만 원입니다. 여기서 250만 원 공제 후 50만 원에 22%를 적용하면 세금은 11만 원으로 줄어듭니다.

## 신고 방법과 기한

해외 주식 양도소득세는 **다음 해 5월에 자진 신고·납부**해야 합니다. 2026년에 발생한 이익은 2027년 5월에 신고합니다. 증권사에서 제공하는 연간 거래 내역서를 기반으로 국세청 홈택스에서 신고할 수 있습니다.

신고를 하지 않으면 가산세가 붙습니다. 금액이 작아도 250만 원을 초과했다면 반드시 신고해야 합니다. 다만 증권사에서 양도소득세 신고 대행 서비스를 제공하는 경우도 있으니 확인해보세요.

## 배당소득세

미국 주식에서 배당을 받으면 **배당소득세 15%(미국 원천징수)**가 먼저 차감됩니다. 한국과 미국 사이의 조세 조약에 따라 미국에서 15%를 먼저 뗀 후 나머지가 지급됩니다.

만약 연간 배당 수입을 포함한 금융소득(이자·배당 합계)이 2,000만 원을 초과하면 금융소득종합과세 대상이 됩니다. 이 경우 다른 소득과 합산해 누진 세율(6~45%)로 과세됩니다. 대부분의 개인 투자자에게는 해당하지 않지만, 배당 수입이 큰 경우 주의가 필요합니다.

## 절세 전략 기초

**연말 손익 조정:** 12월에 실현이익이 250만 원을 초과했다면, 손실 중인 종목을 매도해 순이익을 250만 원 이하로 맞추는 것을 검토합니다. 매도한 종목은 연초에 다시 매수할 수 있습니다.

**가족 계좌 활용:** 배우자나 부모님 명의로 증권 계좌를 개설하고 주식을 증여하면, 각자의 기본공제 250만 원을 별도로 활용할 수 있습니다. 다만 증여 시 증여세 문제가 발생하지 않도록 한도(배우자 6억 원, 성인 자녀 5,000만 원)를 확인해야 합니다.

**장기 보유:** 주식을 팔지 않으면 양도소득세가 발생하지 않습니다. 우량 주식을 장기 보유하는 전략은 과세 이연 효과가 있어 복리 수익률을 극대화할 수 있습니다.

세금 문제는 개인 상황에 따라 다를 수 있습니다. 구체적인 절세 전략은 세무사와 상담하는 것을 권장합니다. 이 글은 일반적인 정보 제공을 목적으로 하며, 세금 신고 조언이 아닙니다.
```

- [ ] **Step 6: Commit**

```bash
git add src/content/articles/
git commit -m "content: 서학개미 5편 추가 (입문·환율·KOSPI비교·ETF·세금)"
```

---

## Task 11: 전체 테스트 + 브라우저 확인

- [ ] **Step 1: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 기존 테스트 + 신규 테스트 PASS

- [ ] **Step 2: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 3: 브라우저 확인 체크리스트**

- [ ] 사이드바에 "📚 투자 가이드" 메뉴 표시
- [ ] `/learn` 접속 시 10편 글 목록 표시
- [ ] 각 카드에 SVG 일러스트, 제목, 날짜, 읽기 시간 표시
- [ ] 광고 배너 자리(회색 박스) 표시
- [ ] 카드 클릭 시 `/learn/:slug` 이동
- [ ] 글 페이지에 제목, 날짜, 읽기 시간, 본문 표시
- [ ] 글 하단 이전/다음/목록 네비게이션 표시
- [ ] 모바일(640px 이하)에서 카드 세로 스택 표시

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Learn 섹션 구현 완료 — 투자 가이드 10편 + AdBanner + SVG 일러스트"
```

---

## 참고: AdSense 슬롯 ID 교체

AdSense 승인 후 실제 슬롯 ID로 교체해야 할 위치:

| 파일 | 현재 더미 값 | 교체 방법 |
|---|---|---|
| `LearnPage.jsx` | `slot="1234567890"` | AdSense 계정에서 광고 단위 생성 후 슬롯 ID 교체 |
| `ArticlePage.jsx` (상단) | `slot="1234567891"` | 동일 |
| `ArticlePage.jsx` (하단) | `slot="1234567892"` | 동일 |

> AdSense 승인 전에는 `data-ad-slot` 더미 값이 있어도 광고가 표시되지 않습니다. 배너 자리만 잡힌 상태로 보입니다.
