# 정적 페이지 재작업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소개/개인정보/도움말 페이지를 대시보드 디자인 언어(카드 패널 + mono 라벨 + Fraunces·골드 마침표)로 재구성하고 문구를 현재 기능 기준으로 재작성.

**Architecture:** 레이아웃(Task 1: CSS + JSX 3개)과 문구(Task 2: ko/en 로케일)를 분리. 정적 페이지를 참조하는 테스트 없음(확인됨) — 회귀 기준은 기존 225개 무수정 통과 + ko/en 키 미러 검증 + 빌드.

**Tech Stack:** React, react-i18next, CSS

**Spec:** `docs/superpowers/specs/2026-06-12-static-pages-design.md`

---

### Task 1: 레이아웃 — CSS + JSX 3개

**Files:**
- Modify: `src/styles/pages.css` (정적 페이지 영역만 — `.placeholder-page`와 404 규칙은 불변)
- Modify: `src/pages/AboutPage.jsx`, `src/pages/PrivacyPage.jsx`, `src/pages/HelpPage.jsx`

- [ ] **Step 1: pages.css 정적 영역 교체**

`src/styles/pages.css`에서 `/* ── Static pages (About / Privacy / Help / 404) ── */` 주석부터 `/* ── 404 page ── */` 주석 **직전까지**(`.static-page`, `.static-page h1`, `.static-tagline`, `.static-page h2`, `.static-page p`, `.static-page ul`, `.static-page ul li`, `.static-faq-*` 규칙들)를 아래로 교체:

```css
/* ── Static pages (About / Privacy / Help) ── */
.static-page {
  max-width: 680px;
  margin: 40px auto;
  padding: 0 24px 60px;
}
.static-page h1 {
  font-family: 'Fraunces', serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -.5px;
  color: var(--ink);
  margin-bottom: 6px;
}
.static-page h1 .dot { color: var(--gold) }
.static-page .static-tagline {
  font-size: 14px;
  color: var(--ink-dim);
  margin-bottom: 28px;
}
.static-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 20px;
}
.static-section .holdings-title { margin-bottom: 12px }
.static-section p {
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
  margin: 0 0 8px;
}
.static-section p:last-child { margin-bottom: 0 }
.static-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.static-list li {
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink);
}
.static-list li::before {
  content: '– ';
  color: var(--accent);
  font-weight: 600;
}
.static-faq-item { margin-bottom: 14px }
.static-faq-item:last-child { margin-bottom: 0 }
.static-faq-q {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
}
.static-faq-q::before {
  content: 'Q ';
  font-family: 'Spline Sans Mono', monospace;
  color: var(--accent);
}
.static-faq-a {
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink-dim);
  margin: 0;
}
```

- [ ] **Step 2: AboutPage.jsx 전체 교체**

```jsx
import { useTranslation } from 'react-i18next'

export default function AboutPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('about.title')}<span className="dot">.</span></h1>
      <p className="static-tagline">{t('about.tagline')}</p>

      <section className="static-section">
        <h2 className="holdings-title">{t('about.featuresTitle')}</h2>
        <ul className="static-list">
          <li>{t('about.feature1')}</li>
          <li>{t('about.feature2')}</li>
          <li>{t('about.feature3')}</li>
          <li>{t('about.feature4')}</li>
          <li>{t('about.feature5')}</li>
        </ul>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('about.whyTitle')}</h2>
        <p>{t('about.whyBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('about.dataTitle')}</h2>
        <p>{t('about.dataBody')}</p>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: PrivacyPage.jsx 전체 교체**

```jsx
import { useTranslation } from 'react-i18next'

export default function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('privacy.title')}<span className="dot">.</span></h1>
      <p className="static-tagline">{t('privacy.lastUpdated')}</p>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.noCollectionTitle')}</h2>
        <p>{t('privacy.noCollectionBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.localDataTitle')}</h2>
        <p>{t('privacy.localDataBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.apisTitle')}</h2>
        <p>{t('privacy.apisBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.cookiesTitle')}</h2>
        <p>{t('privacy.cookiesBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('privacy.contactTitle')}</h2>
        <p>{t('privacy.contactBody')}</p>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: HelpPage.jsx 전체 교체** (신규 `help.portfolioTitle`/`help.portfolioBody` 키는 Task 2에서 추가 — i18next는 미존재 키를 키 이름으로 표시하므로 Task 1 시점 빌드·테스트에 영향 없음)

```jsx
import { useTranslation } from 'react-i18next'

export default function HelpPage() {
  const { t } = useTranslation()
  return (
    <div className="static-page">
      <h1>{t('help.title')}<span className="dot">.</span></h1>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.gettingStartedTitle')}</h2>
        <p>{t('help.gettingStartedBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.sellTitle')}</h2>
        <p>{t('help.sellBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.portfolioTitle')}</h2>
        <p>{t('help.portfolioBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.calendarTitle')}</h2>
        <p>{t('help.calendarBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.backupTitle')}</h2>
        <p>{t('help.backupBody')}</p>
      </section>

      <section className="static-section">
        <h2 className="holdings-title">{t('help.faqTitle')}</h2>
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
      </section>
    </div>
  )
}
```

- [ ] **Step 5: 테스트·빌드·커밋**

Run: `npm test` → Expected: 225 PASS. Run: `npm run build` → 성공.

```bash
git add src/styles/pages.css src/pages/AboutPage.jsx src/pages/PrivacyPage.jsx src/pages/HelpPage.jsx
git commit -m "feat: 정적 페이지를 대시보드 카드 언어로 재구성"
```

---

### Task 2: 문구 재작성 (ko/en 로케일)

**Files:**
- Modify: `src/locales/ko.json` (about/privacy/help 섹션 전체 교체)
- Modify: `src/locales/en.json` (동일)

- [ ] **Step 1: ko.json의 about/privacy/help 섹션을 아래로 교체** (다른 섹션 불변)

```json
  "about": {
    "title": "Ledger 소개",
    "tagline": "국내와 해외 주식을 한 화면에서 추적하는 프라이버시 우선 포트폴리오 트래커",
    "featuresTitle": "주요 기능",
    "feature1": "미국·한국 주식 실시간 시세를 한 화면에서",
    "feature2": "거래 이력 기반 평균단가·실현손익 자동 계산",
    "feature3": "목표 비중 설정과 리밸런싱 가이드",
    "feature4": "실적 캘린더와 보유 종목 맞춤 뉴스",
    "feature5": "모든 데이터는 브라우저에만 저장 — 서버 전송 없음",
    "whyTitle": "만든 이유",
    "whyBody": "국내와 해외 주식을 함께 보유한 투자자를 위한 도구가 마땅치 않았습니다. 증권사 앱은 해외 주식 경험이 약하고, 해외 트래커는 한국 주식을 모릅니다. Ledger는 두 시장을 하나의 포트폴리오로 보여주되, 개인정보는 어디에도 보내지 않는 것을 원칙으로 만들었습니다.",
    "dataTitle": "데이터 출처",
    "dataBody": "미국 시세: Finnhub · 실적 캘린더: Alpha Vantage · 한국 시세·뉴스: Naver Finance"
  },
```

```json
  "privacy": {
    "title": "개인정보처리방침",
    "lastUpdated": "최종 업데이트: 2026년 6월",
    "noCollectionTitle": "수집하는 개인정보",
    "noCollectionBody": "없습니다. Ledger는 이름, 이메일, 결제 정보를 포함해 어떠한 개인정보도 수집하지 않으며, 회원가입도 없습니다.",
    "localDataTitle": "데이터 저장 위치",
    "localDataBody": "보유 종목, 거래 이력, 자산 추이 기록은 사용 중인 브라우저의 localStorage에만 저장됩니다. 이 데이터는 기기를 벗어나지 않으며 어떤 서버에도 전송되지 않습니다. 브라우저 데이터를 삭제하면 함께 삭제되므로 주기적인 백업(내보내기)을 권장합니다.",
    "apisTitle": "외부 서비스",
    "apisBody": "실시간 시세·캘린더·뉴스 조회에 Finnhub, Alpha Vantage, Naver Finance API를 사용합니다. 이 과정에서 조회 대상 종목 코드만 해당 서비스에 전달됩니다. 자세한 내용은 각 서비스의 개인정보처리방침을 참고하세요.",
    "cookiesTitle": "쿠키",
    "cookiesBody": "쿠키를 사용하지 않습니다. 언어 설정(한국어/영어)만 브라우저 localStorage에 저장됩니다.",
    "contactTitle": "문의",
    "contactBody": "개인정보 관련 문의는 GitHub Issues로 연락해 주세요."
  },
```

```json
  "help": {
    "title": "도움말",
    "gettingStartedTitle": "시작하기",
    "gettingStartedBody": "대시보드의 종목 추가 폼에서 종목 이름이나 티커를 검색하세요 — 한국·미국 주식이 함께 검색됩니다. 종목을 선택하면 현재가가 자동으로 입력되고, 수량과 매수단가를 채운 뒤 '+ 매수'를 누르면 됩니다.",
    "sellTitle": "매도 기록",
    "sellBody": "종목 추가 폼에서 매도 토글을 선택하고 보유 종목과 수량, 매도가를 입력한 뒤 '+ 매도'를 누르세요. 실현손익이 자동으로 계산되어 헤더와 거래 이력에 반영됩니다.",
    "portfolioTitle": "현금·목표 비중·리밸런싱",
    "portfolioBody": "보유 종목의 현금 행에서 ✎를 눌러 현금 잔액을 입력하세요 — 원화/달러 기준을 선택할 수 있습니다. 각 종목의 ✎에서 목표 비중(%)을 설정하면 현재 비중과의 차이를 계산한 리밸런싱 가이드가 표시됩니다. 매수·매도 금액 제안은 참고용입니다.",
    "calendarTitle": "캘린더",
    "calendarBody": "캘린더 페이지에서 보유 중인 미국 종목의 실적 발표 일정을 자동으로 확인할 수 있습니다. 배당일 같은 이벤트를 직접 추가하는 것도 가능합니다.",
    "backupTitle": "백업과 복구",
    "backupBody": "대시보드 하단의 '내보내기'로 JSON 백업 파일을 저장하세요. 거래 이력, 자산 추이, 현금, 목표 비중이 모두 포함됩니다. 브라우저 데이터가 사라져도 '불러오기'로 복구할 수 있습니다.",
    "faqTitle": "자주 묻는 질문",
    "faq1Q": "데이터가 사라졌어요.",
    "faq1A": "브라우저 캐시·사이트 데이터를 삭제하면 함께 지워질 수 있습니다. '내보내기'로 주기적인 백업을 권장합니다.",
    "faq2Q": "한국 주식 가격이 장 마감 후에도 업데이트되나요?",
    "faq2A": "한국 주식은 장중에만 실시간으로 조회되며, 장 마감 후에는 종가가 표시됩니다.",
    "faq3Q": "여러 기기에서 같이 쓸 수 있나요?",
    "faq3A": "현재는 기기별로 데이터가 따로 저장됩니다. 내보내기/불러오기로 옮길 수 있고, 기기 간 동기화는 추후 추가될 예정입니다."
  },
```

- [ ] **Step 2: en.json의 동일 섹션을 아래로 교체**

```json
  "about": {
    "title": "About Ledger",
    "tagline": "A privacy-first portfolio tracker for Korean and US stocks — on one screen.",
    "featuresTitle": "Key Features",
    "feature1": "Live US and Korean stock prices, side by side",
    "feature2": "Average cost and realized gains computed from your transaction history",
    "feature3": "Target weights and a rebalancing guide",
    "feature4": "Earnings calendar and news tailored to your holdings",
    "feature5": "Everything stays in your browser — nothing is sent to a server",
    "whyTitle": "Why We Built This",
    "whyBody": "There was no good tool for investors holding both Korean and US stocks. Brokerage apps are weak on foreign markets, and global trackers don't know Korean tickers. Ledger shows both markets as one portfolio — and keeps your data entirely on your device.",
    "dataTitle": "Data Sources",
    "dataBody": "US prices: Finnhub · Earnings calendar: Alpha Vantage · Korean prices & news: Naver Finance"
  },
```

```json
  "privacy": {
    "title": "Privacy Policy",
    "lastUpdated": "Last updated: June 2026",
    "noCollectionTitle": "Personal Data We Collect",
    "noCollectionBody": "None. Ledger collects no personal information — no names, emails, or payment details. There is no sign-up.",
    "localDataTitle": "Where Your Data Lives",
    "localDataBody": "Your holdings, transaction history, and portfolio snapshots are stored only in your browser's localStorage. They never leave your device and are never sent to any server. Clearing browser data deletes them too, so we recommend regular backups (Export).",
    "apisTitle": "Third-Party Services",
    "apisBody": "Ledger uses the Finnhub, Alpha Vantage, and Naver Finance APIs for live prices, earnings, and news. Only the ticker symbols being looked up are transmitted. See each service's privacy policy for details.",
    "cookiesTitle": "Cookies",
    "cookiesBody": "Ledger uses no cookies. Only your language preference (Korean/English) is saved in localStorage.",
    "contactTitle": "Contact",
    "contactBody": "For privacy questions, please reach out via GitHub Issues."
  },
```

```json
  "help": {
    "title": "Help",
    "gettingStartedTitle": "Getting Started",
    "gettingStartedBody": "Search a company name or ticker in the dashboard's add form — Korean and US stocks are searched together. Picking a result auto-fills the current price; enter quantity and cost, then press '+ Buy'.",
    "sellTitle": "Recording a Sale",
    "sellBody": "Switch the add form to Sell, choose a holding, enter quantity and sale price, then press '+ Sell'. Realized gains are calculated automatically and shown in the header and transaction history.",
    "portfolioTitle": "Cash, Targets & Rebalancing",
    "portfolioBody": "Press ✎ on the cash row to enter your cash balance — you can choose KRW or USD. Set a target weight (%) on each holding's ✎, and a rebalancing guide will compare current weights against your targets. Buy/sell amounts are suggestions only.",
    "calendarTitle": "Calendar",
    "calendarBody": "The Calendar page automatically shows upcoming earnings dates for your US holdings. You can also add events like dividend dates manually.",
    "backupTitle": "Backup & Restore",
    "backupBody": "Use 'Export' at the bottom of the dashboard to save a JSON backup — it includes transactions, snapshots, cash, and target weights. If your browser data is ever cleared, restore it with 'Import'.",
    "faqTitle": "FAQ",
    "faq1Q": "My data disappeared.",
    "faq1A": "Clearing browser cache or site data can delete it. We recommend regular backups via 'Export'.",
    "faq2Q": "Are Korean stock prices updated after market close?",
    "faq2A": "Korean stocks update live only during market hours; after close, the closing price is shown.",
    "faq3Q": "Can I use Ledger on multiple devices?",
    "faq3A": "Data is currently stored per device. You can move it with Export/Import; cross-device sync is planned."
  },
```

- [ ] **Step 3: 키 미러 검증 + 테스트·빌드·커밋**

Run:
```bash
node -e "const k=require('./src/locales/ko.json'),e=require('./src/locales/en.json');for(const s of ['about','privacy','help']){const a=Object.keys(k[s]),b=Object.keys(e[s]);console.log(s, JSON.stringify(a.filter(x=>!b.includes(x))), JSON.stringify(b.filter(x=>!a.includes(x))))}"
```
Expected: 세 줄 모두 빈 배열 2개.

Run: `npm test` → 225 PASS. `npm run build` → 성공.

```bash
git add src/locales/ko.json src/locales/en.json
git commit -m "feat: 정적 페이지 문구 재작성 — 현재 기능 반영 + 리밸런싱·현금 도움말 신설"
```

---

### Task 3: 육안 검증 (사용자 확인)

- [ ] dev 서버에서 사이드바 → 소개/개인정보처리방침/도움말:
  1. 페이지 제목이 Fraunces + 골드 마침표, 섹션이 대시보드와 같은 카드
  2. 기능 리스트 민트 대시, FAQ 민트 Q 프리픽스
  3. 도움말에 "현금·목표 비중·리밸런싱" 섹션, 문구가 현재 UI 명칭과 일치
  4. 한/영 전환 정상, 모바일 폭 정상
