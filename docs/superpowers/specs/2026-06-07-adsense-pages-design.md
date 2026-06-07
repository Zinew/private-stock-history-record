# AdSense 준비 페이지 설계 문서

**작성일: 2026-06-07**

## 목표

Google AdSense 승인을 위해 필요한 4개 페이지(About, 개인정보처리방침, 도움말, 404)를 추가한다. 사이드바 하단 보조 링크로 접근 가능하며, 기존 KO/EN i18n을 그대로 따른다.

## 아키텍처

- React Router의 `<Routes>`에 4개 경로 추가
- 각 페이지는 `portfolio` prop 불필요 — 독립적인 정적 콘텐츠 컴포넌트
- i18n 키를 통해 한/영 전환 지원
- 사이드바 하단에 보조 내비게이션 링크 추가

## 파일 구조

```
신규 생성:
  src/pages/AboutPage.jsx
  src/pages/PrivacyPage.jsx
  src/pages/HelpPage.jsx
  src/pages/NotFoundPage.jsx

수정:
  src/App.jsx              — 4개 Route 추가
  src/components/Sidebar.jsx — 보조 링크 섹션 추가
  src/locales/ko.json      — about.*, privacy.*, help.*, notFound.* 키 추가
  src/locales/en.json      — 동일
  src/index.css            — 사이드바 보조 링크 스타일, 정적 페이지 공통 스타일
```

## 라우팅

```
/about    → AboutPage
/privacy  → PrivacyPage
/help     → HelpPage
*         → NotFoundPage  (catch-all, 광고 없음)
```

App.jsx의 `<Routes>` 마지막에 추가:

```jsx
<Route path="/about" element={<AboutPage />} />
<Route path="/privacy" element={<PrivacyPage />} />
<Route path="/help" element={<HelpPage />} />
<Route path="*" element={<NotFoundPage />} />
```

## 사이드바 변경

기존 메인 메뉴(대시보드/캘린더/뉴스) 아래 구분선을 추가하고 보조 링크 렌더링.

```jsx
const SUB_NAV_ITEMS = [
  { path: '/about', key: 'sidebar.about', icon: 'ℹ️' },
  { path: '/privacy', key: 'sidebar.privacy', icon: '🔒' },
  { path: '/help', key: 'sidebar.help', icon: '❓' },
]
```

스타일: `nav-sub-item` 클래스, font-size 12px, color var(--ink-faint), 메인 메뉴보다 작고 흐리게.

## 각 페이지 명세

### AboutPage (`/about`)

**섹션 구성:**
1. 앱 이름 + 한 줄 소개
2. 핵심 기능 목록 (국내+해외 동시 실시간 관리 / 거래 이력 기반 손익 계산 / 개인정보 보호 — 서버 없음)
3. 만든 이유 (한 문단)
4. 데이터 출처 (Finnhub, Alpha Vantage, Naver Finance)

**i18n 키:**
```json
"about": {
  "title": "Ledger 소개",
  "tagline": "국내·해외 주식을 한 화면에서 실시간으로 관리하는 포트폴리오 트래커",
  "featuresTitle": "주요 기능",
  "feature1": "미국주(USD) + 한국주(KRW) 동시 실시간 가격 조회",
  "feature2": "거래 이력 기반 평균단가·실현손익 자동 계산",
  "feature3": "실적 발표·배당 일정 자동 조회 (캘린더)",
  "feature4": "보유 종목 맞춤 뉴스 피드",
  "feature5": "모든 데이터는 브라우저에만 저장 — 서버 전송 없음",
  "whyTitle": "만든 이유",
  "whyBody": "국내와 해외 주식을 동시에 정확하게 보여주는 앱이 없어서 직접 만들었습니다. 개인정보 없이 브라우저에서만 동작하는 것을 원칙으로 합니다.",
  "dataTitle": "데이터 출처",
  "dataBody": "미국 주가: Finnhub / 실적 캘린더: Alpha Vantage / 한국 주가·뉴스: Naver Finance"
}
```

---

### PrivacyPage (`/privacy`)

**섹션 구성:**
1. 수집하는 개인정보: **없음**
2. 브라우저 로컬 저장 데이터 (localStorage — 기기 밖으로 전송되지 않음)
3. 사용하는 외부 API와 목적
4. 쿠키: 없음 (언어 설정만 localStorage에 저장)
5. 문의처

**i18n 키:**
```json
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
}
```

---

### HelpPage (`/help`)

**섹션 구성:**
1. 시작하기 (종목 추가 방법)
2. 매도 입력 방법
3. 캘린더 사용법
4. 데이터 백업 및 복구
5. FAQ (자주 묻는 질문 3~5개)

**i18n 키:**
```json
"help": {
  "title": "도움말",
  "gettingStartedTitle": "시작하기",
  "gettingStartedBody": "상단 메뉴에서 대시보드로 이동 후 종목 추가 폼에서 매수 거래를 입력하세요. 종목명을 검색하면 현재가가 자동으로 입력됩니다.",
  "sellTitle": "매도 입력",
  "sellBody": "종목 추가 폼의 '매도' 탭을 선택하고 보유 종목 중 매도할 종목, 수량, 매도가를 입력하세요. 실현손익이 자동으로 계산됩니다.",
  "calendarTitle": "캘린더",
  "calendarBody": "캘린더 페이지에서 보유 USD 종목의 실적 발표일을 자동으로 확인할 수 있습니다. 수동 이벤트 추가도 가능합니다.",
  "backupTitle": "데이터 백업 및 복구",
  "backupBody": "대시보드 하단의 '내보내기' 버튼으로 JSON 파일을 저장하세요. 브라우저 데이터가 초기화되어도 '불러오기'로 복구할 수 있습니다.",
  "faqTitle": "자주 묻는 질문",
  "faq1Q": "데이터가 사라졌어요.",
  "faq1A": "브라우저 캐시 초기화 시 데이터가 삭제될 수 있습니다. 정기적으로 내보내기(백업)를 권장합니다.",
  "faq2Q": "한국 주식 가격이 장 마감 후에도 업데이트되나요?",
  "faq2A": "한국 주식은 장중에만 실시간 가격이 조회됩니다. 장 마감 후에는 종가로 표시됩니다.",
  "faq3Q": "여러 기기에서 동시에 사용할 수 있나요?",
  "faq3A": "현재는 기기별로 데이터가 독립적으로 저장됩니다. 기기 간 동기화 기능은 추후 추가 예정입니다."
}
```

---

### NotFoundPage (`/` 외 존재하지 않는 경로)

**내용:** 404 안내 문구 + 대시보드로 돌아가기 버튼.

**광고 없음** (AdSense 정책: 콘텐츠 없는 페이지에 광고 금지).

**i18n 키:**
```json
"notFound": {
  "title": "페이지를 찾을 수 없습니다",
  "body": "요청하신 페이지가 존재하지 않거나 이동되었습니다.",
  "goHome": "대시보드로 돌아가기"
}
```

## CSS 추가 클래스

```css
/* 사이드바 보조 링크 */
.nav-sub-item { font-size: 12px; color: var(--ink-faint); padding: 5px 16px; ... }
.nav-sub-item:hover { color: var(--ink); }

/* 정적 페이지 공통 */
.static-page { max-width: 680px; margin: 40px auto; padding: 0 20px; }
.static-page h1 { font-size: 22px; margin-bottom: 8px; }
.static-page h2 { font-size: 15px; margin: 28px 0 8px; color: var(--ink-faint); }
.static-page p { font-size: 14px; line-height: 1.7; color: var(--ink); }
```

## 테스트 계획

- `/about`, `/privacy`, `/help` 직접 URL 접속 확인
- 존재하지 않는 URL (`/xyz`) → NotFoundPage 표시 확인
- 사이드바 링크 클릭 → 올바른 페이지로 이동 확인
- KO/EN 전환 시 텍스트 변경 확인
- 모바일 너비에서 정적 페이지 레이아웃 확인
