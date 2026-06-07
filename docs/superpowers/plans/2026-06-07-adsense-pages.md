# AdSense 준비 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google AdSense 승인을 위한 4개 페이지(About, 개인정보처리방침, 도움말, 404) 추가 및 사이드바 보조 링크 연결.

**Architecture:** 각 페이지는 독립적인 정적 컴포넌트로 `portfolio` prop 불필요. App.jsx에 라우트 추가, Sidebar.jsx 하단에 보조 링크 섹션 추가, 기존 i18n 구조(ko.json/en.json)에 새 키 추가.

**Tech Stack:** React, react-router-dom, react-i18next, Vite

---

## 파일 구조

```
신규 생성:
  src/pages/AboutPage.jsx
  src/pages/PrivacyPage.jsx
  src/pages/HelpPage.jsx
  src/pages/NotFoundPage.jsx

수정:
  src/App.jsx                  — 4개 Route 추가
  src/components/Sidebar.jsx   — SUB_NAV_ITEMS + sidebar-sub-nav 섹션
  src/locales/ko.json          — about.*, privacy.*, help.*, notFound.*, sidebar.about/privacy/help 키
  src/locales/en.json          — 동일
  src/index.css                — .nav-sub-item, .static-page, .static-page h1/h2/p 스타일
```

---

### Task 1: i18n 키 추가 (ko.json + en.json)

**Files:**
- Modify: `src/locales/ko.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: ko.json에 sidebar 보조 링크 키 추가**

`src/locales/ko.json`의 `"sidebar"` 객체에 다음 3개 키를 추가:

```json
"sidebar": {
  "dashboard": "대시보드",
  "calendar": "캘린더",
  "news": "뉴스",
  "closeMenu": "메뉴 닫기",
  "openMenu": "메뉴 열기",
  "about": "소개",
  "privacy": "개인정보처리방침",
  "help": "도움말"
}
```

- [ ] **Step 2: ko.json에 페이지 콘텐츠 키 추가**

`src/locales/ko.json`의 최상위 객체에 다음 4개 섹션을 추가 (기존 `"backup"` 블록 뒤):

```json
"about": {
  "title": "Ledger 소개",
  "tagline": "국내·해외 주식을 한 화면에서 실시간으로 관리하는 포트폴리오 트래커",
  "featuresTitle": "주요 기능",
  "feature1": "미국주(USD) + 한국주(KRW) 동시 실시간 가격 조회",
  "feature2": "거래 이력 기반 평균단가·실현손익 자동 계산",
  "feature3": "실적 발표 일정 자동 조회 (캘린더)",
  "feature4": "보유 종목 맞춤 뉴스 피드",
  "feature5": "모든 데이터는 브라우저에만 저장 — 서버 전송 없음",
  "whyTitle": "만든 이유",
  "whyBody": "국내와 해외 주식을 동시에 정확하게 보여주는 앱이 없어서 직접 만들었습니다. 개인정보 없이 브라우저에서만 동작하는 것을 원칙으로 합니다.",
  "dataTitle": "데이터 출처",
  "dataBody": "미국 주가: Finnhub · 실적 캘린더: Alpha Vantage · 한국 주가·뉴스: Naver Finance"
},
"privacy": {
  "title": "개인정보처리방침",
  "lastUpdated": "최종 업데이트: 2026년 6월",
  "noCollectionTitle": "수집하는 개인정보",
  "noCollectionBody": "Ledger는 이름, 이메일, 결제 정보 등 어떠한 개인정보도 수집하지 않습니다.",
  "localDataTitle": "브라우저 로컬 저장 데이터",
  "localDataBody": "보유 종목, 거래 이력, 스냅샷 기록은 브라우저의 localStorage에만 저장됩니다. 이 데이터는 사용자 기기를 벗어나지 않으며 어떠한 서버에도 전송되지 않습니다.",
  "apisTitle": "사용하는 외부 서비스",
  "apisBody": "실시간 주가 조회를 위해 Finnhub, Alpha Vantage, Naver Finance API를 사용합니다. 이 과정에서 조회하는 종목 코드가 해당 서비스에 전달될 수 있습니다. 각 서비스의 개인정보처리방침을 참고하세요.",
  "cookiesTitle": "쿠키",
  "cookiesBody": "쿠키를 사용하지 않습니다. 언어 설정(한국어/영어)만 브라우저 localStorage에 저장합니다.",
  "contactTitle": "문의",
  "contactBody": "개인정보 관련 문의사항이 있으시면 GitHub Issues를 통해 연락해 주세요."
},
"help": {
  "title": "도움말",
  "gettingStartedTitle": "시작하기",
  "gettingStartedBody": "대시보드에서 종목 추가 폼을 통해 매수 거래를 입력하세요. 종목명을 검색하면 현재가가 자동으로 입력됩니다.",
  "sellTitle": "매도 입력",
  "sellBody": "종목 추가 폼의 '매도' 탭을 선택하고 보유 종목, 수량, 매도가를 입력하세요. 실현손익이 자동으로 계산됩니다.",
  "calendarTitle": "캘린더",
  "calendarBody": "캘린더 페이지에서 보유 USD 종목의 실적 발표일을 자동으로 확인할 수 있습니다. 직접 이벤트를 추가하는 것도 가능합니다.",
  "backupTitle": "데이터 백업 및 복구",
  "backupBody": "대시보드 하단의 '내보내기' 버튼으로 JSON 파일을 저장하세요. 브라우저 데이터가 초기화되어도 '불러오기'로 복구할 수 있습니다.",
  "faqTitle": "자주 묻는 질문",
  "faq1Q": "데이터가 사라졌어요.",
  "faq1A": "브라우저 캐시 초기화 시 데이터가 삭제될 수 있습니다. 정기적으로 내보내기(백업)를 권장합니다.",
  "faq2Q": "한국 주식 가격이 장 마감 후에도 업데이트되나요?",
  "faq2A": "한국 주식은 장중에만 실시간 가격이 조회됩니다. 장 마감 후에는 종가로 표시됩니다.",
  "faq3Q": "여러 기기에서 동시에 사용할 수 있나요?",
  "faq3A": "현재는 기기별로 데이터가 독립적으로 저장됩니다. 기기 간 동기화 기능은 추후 추가 예정입니다."
},
"notFound": {
  "title": "페이지를 찾을 수 없습니다",
  "body": "요청하신 페이지가 존재하지 않거나 이동되었습니다.",
  "goHome": "대시보드로 돌아가기"
}
```

- [ ] **Step 3: en.json에 sidebar 보조 링크 키 추가**

`src/locales/en.json`의 `"sidebar"` 객체에 추가:

```json
"sidebar": {
  "dashboard": "Dashboard",
  "calendar": "Calendar",
  "news": "News",
  "closeMenu": "Close menu",
  "openMenu": "Open menu",
  "about": "About",
  "privacy": "Privacy Policy",
  "help": "Help"
}
```

- [ ] **Step 4: en.json에 페이지 콘텐츠 키 추가**

`src/locales/en.json`의 최상위 객체에 추가 (기존 `"backup"` 블록 뒤):

```json
"about": {
  "title": "About Ledger",
  "tagline": "A portfolio tracker that manages domestic and international stocks in real time — on one screen.",
  "featuresTitle": "Key Features",
  "feature1": "Real-time prices for US (USD) and Korean (KRW) stocks simultaneously",
  "feature2": "Automatic average cost and realized gain calculation from transaction history",
  "feature3": "Automatic earnings calendar (upcoming 90 days)",
  "feature4": "Personalized news feed for your holdings",
  "feature5": "All data stays in your browser — nothing is sent to a server",
  "whyTitle": "Why We Built This",
  "whyBody": "No existing app handled both Korean and international stocks accurately in one place, so we built our own. Privacy-first: everything runs in your browser.",
  "dataTitle": "Data Sources",
  "dataBody": "US prices: Finnhub · Earnings calendar: Alpha Vantage · Korean prices & news: Naver Finance"
},
"privacy": {
  "title": "Privacy Policy",
  "lastUpdated": "Last updated: June 2026",
  "noCollectionTitle": "Personal Data Collected",
  "noCollectionBody": "Ledger does not collect any personal information — no names, emails, or payment details.",
  "localDataTitle": "Browser-Local Storage",
  "localDataBody": "Your holdings, transaction history, and snapshots are stored only in your browser's localStorage. This data never leaves your device and is never sent to any server.",
  "apisTitle": "Third-Party Services",
  "apisBody": "Ledger uses Finnhub, Alpha Vantage, and Naver Finance APIs to fetch real-time prices and news. Ticker symbols you hold may be transmitted to these services. Please refer to their respective privacy policies.",
  "cookiesTitle": "Cookies",
  "cookiesBody": "Ledger does not use cookies. Only your language preference (Korean/English) is saved in localStorage.",
  "contactTitle": "Contact",
  "contactBody": "For privacy-related questions, please reach out via GitHub Issues."
},
"help": {
  "title": "Help",
  "gettingStartedTitle": "Getting Started",
  "gettingStartedBody": "Go to the Dashboard and enter a buy transaction in the form. Search by company name to auto-fill the current price.",
  "sellTitle": "Recording a Sale",
  "sellBody": "Switch to the 'Sell' tab in the transaction form, select a holding, and enter the quantity and sale price. Realized gain is calculated automatically.",
  "calendarTitle": "Calendar",
  "calendarBody": "The Calendar page automatically shows upcoming earnings dates for your USD holdings. You can also add events manually.",
  "backupTitle": "Backup & Restore",
  "backupBody": "Use the 'Export' button at the bottom of the Dashboard to save a JSON file. If your browser data is cleared, use 'Import' to restore it.",
  "faqTitle": "FAQ",
  "faq1Q": "My data disappeared.",
  "faq1A": "Browser cache clearing can delete localStorage data. We recommend exporting a backup regularly.",
  "faq2Q": "Are Korean stock prices updated after market close?",
  "faq2A": "Korean prices are fetched in real time during market hours only. After close, the last traded price is shown.",
  "faq3Q": "Can I use Ledger on multiple devices?",
  "faq3A": "Each device stores data independently for now. Cross-device sync is planned for a future update."
},
"notFound": {
  "title": "Page Not Found",
  "body": "The page you requested doesn't exist or has been moved.",
  "goHome": "Go to Dashboard"
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/locales/ko.json src/locales/en.json
git commit -m "feat: add i18n keys for about/privacy/help/404 pages"
```

---

### Task 2: CSS 스타일 추가

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 정적 페이지 공통 스타일 추가**

`src/index.css` 파일 맨 끝에 다음을 추가:

```css
/* ── Static pages (About / Privacy / Help / 404) ── */
.static-page {
  max-width: 680px;
  margin: 40px auto;
  padding: 0 24px 60px;
}
.static-page h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 6px;
}
.static-page .static-tagline {
  font-size: 14px;
  color: var(--ink-dim);
  margin-bottom: 36px;
}
.static-page h2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 32px 0 8px;
}
.static-page p {
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
  margin: 0 0 8px;
}
.static-page ul {
  margin: 0 0 8px;
  padding-left: 20px;
}
.static-page ul li {
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
}
.static-faq-item { margin-bottom: 16px }
.static-faq-q {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
}
.static-faq-a {
  font-size: 14px;
  color: var(--ink-dim);
  line-height: 1.7;
}

/* ── 404 page ── */
.not-found-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 12px;
  text-align: center;
  padding: 0 24px;
}
.not-found-page h1 {
  font-size: 20px;
  color: var(--ink);
}
.not-found-page p {
  font-size: 14px;
  color: var(--ink-dim);
}
.not-found-page a {
  margin-top: 8px;
  padding: 10px 20px;
  background: var(--accent);
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
}
.not-found-page a:hover { opacity: 0.85 }

/* ── Sidebar sub-nav ── */
.sidebar-sub-nav {
  padding: 8px 10px;
  border-top: 1px solid var(--line);
}
.nav-sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 6px;
  color: var(--ink-faint);
  text-decoration: none;
  font-size: 12px;
  transition: background .15s, color .15s;
}
.nav-sub-item:hover { background: var(--panel-2); color: var(--ink-dim) }
.nav-sub-item.active { color: var(--ink-dim) }
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.css
git commit -m "feat: add static page and sidebar sub-nav CSS styles"
```

---

### Task 3: NotFoundPage 생성

**Files:**
- Create: `src/pages/NotFoundPage.jsx`

- [ ] **Step 1: NotFoundPage 컴포넌트 작성**

`src/pages/NotFoundPage.jsx` 파일 생성:

```jsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="not-found-page">
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <Link to="/">{t('notFound.goHome')}</Link>
    </div>
  )
}
```

- [ ] **Step 2: App.jsx에 NotFoundPage import 및 catch-all Route 추가**

`src/App.jsx` 상단에 추가:
```jsx
import NotFoundPage from './pages/NotFoundPage.jsx'
```

`<Routes>` 내부 마지막 줄(기존 `/news` Route 바로 뒤)에 추가:
```jsx
<Route path="*" element={<NotFoundPage />} />
```

이 시점의 App.jsx Routes 블록:
```jsx
<Routes>
  <Route path="/" element={<DashboardPage portfolio={portfolio} />} />
  <Route path="/calendar" element={<CalendarPage portfolio={portfolio} />} />
  <Route path="/news" element={<NewsPage portfolio={portfolio} />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

- [ ] **Step 3: 브라우저에서 확인**

`npm run dev` 실행 후 `http://localhost:5173/xyz` 접속 → "페이지를 찾을 수 없습니다" 표시 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/NotFoundPage.jsx src/App.jsx
git commit -m "feat: add NotFoundPage and catch-all route"
```

---

### Task 4: AboutPage 생성

**Files:**
- Create: `src/pages/AboutPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: AboutPage 컴포넌트 작성**

`src/pages/AboutPage.jsx` 파일 생성:

```jsx
import { useTranslation } from 'react-i18next'

export default function AboutPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('about.title')}</h1>
      <p className="static-tagline">{t('about.tagline')}</p>

      <h2>{t('about.featuresTitle')}</h2>
      <ul>
        <li>{t('about.feature1')}</li>
        <li>{t('about.feature2')}</li>
        <li>{t('about.feature3')}</li>
        <li>{t('about.feature4')}</li>
        <li>{t('about.feature5')}</li>
      </ul>

      <h2>{t('about.whyTitle')}</h2>
      <p>{t('about.whyBody')}</p>

      <h2>{t('about.dataTitle')}</h2>
      <p>{t('about.dataBody')}</p>
    </div>
  )
}
```

- [ ] **Step 2: App.jsx에 AboutPage import 및 Route 추가**

`src/App.jsx` 상단에 추가:
```jsx
import AboutPage from './pages/AboutPage.jsx'
```

`<Routes>` 내부에 추가 (NotFoundPage Route 바로 위):
```jsx
<Route path="/about" element={<AboutPage />} />
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:5173/about` 접속 → 소개 페이지 표시 확인. KO/EN 언어 전환 시 텍스트 변경 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/AboutPage.jsx src/App.jsx
git commit -m "feat: add AboutPage"
```

---

### Task 5: PrivacyPage 생성

**Files:**
- Create: `src/pages/PrivacyPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: PrivacyPage 컴포넌트 작성**

`src/pages/PrivacyPage.jsx` 파일 생성:

```jsx
import { useTranslation } from 'react-i18next'

export default function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('privacy.title')}</h1>
      <p className="static-tagline">{t('privacy.lastUpdated')}</p>

      <h2>{t('privacy.noCollectionTitle')}</h2>
      <p>{t('privacy.noCollectionBody')}</p>

      <h2>{t('privacy.localDataTitle')}</h2>
      <p>{t('privacy.localDataBody')}</p>

      <h2>{t('privacy.apisTitle')}</h2>
      <p>{t('privacy.apisBody')}</p>

      <h2>{t('privacy.cookiesTitle')}</h2>
      <p>{t('privacy.cookiesBody')}</p>

      <h2>{t('privacy.contactTitle')}</h2>
      <p>{t('privacy.contactBody')}</p>
    </div>
  )
}
```

- [ ] **Step 2: App.jsx에 PrivacyPage import 및 Route 추가**

`src/App.jsx` 상단에 추가:
```jsx
import PrivacyPage from './pages/PrivacyPage.jsx'
```

`<Routes>` 내부에 추가:
```jsx
<Route path="/privacy" element={<PrivacyPage />} />
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:5173/privacy` 접속 → 개인정보처리방침 페이지 표시 확인. KO/EN 전환 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/PrivacyPage.jsx src/App.jsx
git commit -m "feat: add PrivacyPage"
```

---

### Task 6: HelpPage 생성

**Files:**
- Create: `src/pages/HelpPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: HelpPage 컴포넌트 작성**

`src/pages/HelpPage.jsx` 파일 생성:

```jsx
import { useTranslation } from 'react-i18next'

export default function HelpPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('help.title')}</h1>

      <h2>{t('help.gettingStartedTitle')}</h2>
      <p>{t('help.gettingStartedBody')}</p>

      <h2>{t('help.sellTitle')}</h2>
      <p>{t('help.sellBody')}</p>

      <h2>{t('help.calendarTitle')}</h2>
      <p>{t('help.calendarBody')}</p>

      <h2>{t('help.backupTitle')}</h2>
      <p>{t('help.backupBody')}</p>

      <h2>{t('help.faqTitle')}</h2>
      <div className="static-faq-item">
        <p className="static-faq-q">{t('help.faq1Q')}</p>
        <p className="static-faq-a">{t('help.faq1A')}</p>
      </div>
      <div className="static-faq-item">
        <p className="static-faq-q">{t('help.faq2Q')}</p>
        <p className="static-faq-a">{t('help.faq2A')}</p>
      </div>
      <div className="static-faq-item">
        <p className="static-faq-q">{t('help.faq3Q')}</p>
        <p className="static-faq-a">{t('help.faq3A')}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: App.jsx에 HelpPage import 및 Route 추가**

`src/App.jsx` 상단에 추가:
```jsx
import HelpPage from './pages/HelpPage.jsx'
```

`<Routes>` 내부에 추가:
```jsx
<Route path="/help" element={<HelpPage />} />
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:5173/help` 접속 → 도움말 페이지 표시 확인. FAQ 섹션 렌더링 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/HelpPage.jsx src/App.jsx
git commit -m "feat: add HelpPage"
```

---

### Task 7: Sidebar 보조 링크 추가

**Files:**
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: SUB_NAV_ITEMS 배열 추가 및 sidebar-sub-nav 섹션 렌더링**

`src/components/Sidebar.jsx` 전체를 다음으로 교체:

```jsx
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const NAV_ITEMS = [
  { path: '/', key: 'sidebar.dashboard', icon: '📊' },
  { path: '/calendar', key: 'sidebar.calendar', icon: '📅' },
  { path: '/news', key: 'sidebar.news', icon: '📰' },
]

const SUB_NAV_ITEMS = [
  { path: '/about', key: 'sidebar.about', icon: 'ℹ️' },
  { path: '/privacy', key: 'sidebar.privacy', icon: '🔒' },
  { path: '/help', key: 'sidebar.help', icon: '❓' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <div className={`sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">LEDGER.</span>
          <button className="sidebar-close" onClick={onClose} aria-label={t('sidebar.closeMenu')}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, key, icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item${pathname === path ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{icon}</span>
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-sub-nav">
          {SUB_NAV_ITEMS.map(({ path, key, icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-sub-item${pathname === path ? ' active' : ''}`}
              onClick={onClose}
            >
              <span>{icon}</span>
              <span>{t(key)}</span>
            </Link>
          ))}
        </div>
        <div className="sidebar-lang">
          <button
            className={`lang-btn${i18n.language === 'ko' ? ' active' : ''}`}
            onClick={() => i18n.changeLanguage('ko')}
          >KO</button>
          <button
            className={`lang-btn${i18n.language === 'en' ? ' active' : ''}`}
            onClick={() => i18n.changeLanguage('en')}
          >EN</button>
        </div>
        <div className="sidebar-footer">Ledger v2</div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

사이드바 열기 → 메인 메뉴(대시보드/캘린더/뉴스) 아래 구분선 후 소개/개인정보처리방침/도움말 링크 표시 확인. 각 링크 클릭 시 올바른 페이지로 이동 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat: add sub-nav links to sidebar (about/privacy/help)"
```

---

### Task 8: 최종 확인 및 푸시

- [ ] **Step 1: 전체 흐름 확인**

`npm run dev`로 로컬 실행 후 다음을 순서대로 확인:

1. `http://localhost:5173/about` → About 페이지 렌더링
2. `http://localhost:5173/privacy` → 개인정보처리방침 렌더링
3. `http://localhost:5173/help` → 도움말 + FAQ 렌더링
4. `http://localhost:5173/xyz` → 404 페이지 렌더링 (대시보드로 돌아가기 버튼 동작 확인)
5. 사이드바 → 보조 링크 3개 표시 및 클릭 이동 확인
6. KO/EN 전환 후 각 페이지 텍스트 변경 확인

- [ ] **Step 2: 빌드 오류 없음 확인**

```bash
npm run build
```

Expected: `dist/` 생성, 오류 없음.

- [ ] **Step 3: origin/main 푸시**

```bash
git push origin main
```
