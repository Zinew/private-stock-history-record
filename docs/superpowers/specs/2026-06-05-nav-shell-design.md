# 네비게이션 셸 설계

## 개요

햄버거 메뉴 버튼 → 좌측 오버레이 드로어 사이드바 → 3개 라우트(대시보드·캘린더·뉴스)로 구성된 네비게이션 셸. 캘린더·뉴스 페이지 내용은 별도 서브프로젝트로 구현하고, 이 스펙은 셸 인프라만 다룬다.

## 기술 선택

- **라우팅**: `react-router-dom` v6 (`BrowserRouter` + `Routes` + `Route`)
- **사이드바**: 오버레이 드로어 (콘텐츠 위에 떠오름, 배경 어두운 오버레이)
- **Cloudflare Pages**: `public/_redirects` → `/* /index.html 200`

## 파일 구조

| 상태 | 파일 | 역할 |
|------|------|------|
| 설치 | `react-router-dom` | 라우팅 |
| 생성 | `public/_redirects` | Cloudflare SPA 리다이렉트 |
| 수정 | `src/main.jsx` | `BrowserRouter` 감싸기 |
| 생성 | `src/components/Sidebar.jsx` | 오버레이 드로어 컴포넌트 |
| 수정 | `src/components/Header.jsx` | ☰ 버튼 추가 (브랜드명 왼쪽) |
| 수정 | `src/App.jsx` | `Routes` + `Route` 설정, `sidebarOpen` 상태 관리 |
| 생성 | `src/pages/DashboardPage.jsx` | 기존 App 콘텐츠 이동 |
| 생성 | `src/pages/CalendarPage.jsx` | "준비 중" 플레이스홀더 |
| 생성 | `src/pages/NewsPage.jsx` | "준비 중" 플레이스홀더 |
| 수정 | `src/index.css` | 사이드바·오버레이 스타일 |

## 컴포넌트 설계

### `Sidebar.jsx`

```jsx
// Props: isOpen, onClose
// useLocation() 내부에서 호출해 현재 경로 판단 (prop으로 받지 않음)
```

- `isOpen` true 시 `transform: translateX(0)`, false 시 `translateX(-100%)`로 슬라이드 인/아웃
- 배경 오버레이 클릭 시 `onClose` 호출
- 너비: 220px
- 메뉴 항목: 대시보드(`/`) · 캘린더(`/calendar`) · 뉴스(`/news`) — 현재 경로 항목 활성화 표시
- 상단: "LEDGER." 로고 + ✕ 닫기 버튼
- 하단: "Ledger v2" 버전 레이블

### `Header.jsx` 변경

- `onMenuOpen` prop 추가
- 브랜드명 왼쪽에 ☰ 버튼 추가

### `App.jsx` 변경

- `sidebarOpen` state 추가
- `<Routes>` 로 3개 페이지 라우팅
- `Sidebar`에 `isOpen`, `onClose` 전달
- `Header`에 `onMenuOpen` 전달

### 라우트 구성

| 경로 | 컴포넌트 |
|------|----------|
| `/` | `DashboardPage` |
| `/calendar` | `CalendarPage` |
| `/news` | `NewsPage` |

### `DashboardPage.jsx`

기존 `App.jsx`의 Charts + HoldingsTable + SnapshotBar + footer를 그대로 이동. `holdings`, `snaps` 등 모든 상태는 `App.jsx`에서 props로 전달.

### `CalendarPage.jsx` / `NewsPage.jsx`

```jsx
export default function CalendarPage() {
  return <div className="placeholder-page">캘린더 — 준비 중</div>
}
```

## CSS 추가

```css
.sidebar { ... }          /* 220px, fixed, z-index 100, slide transition */
.sidebar-overlay { ... }  /* inset 0, fixed, z-index 99, background rgba */
.menu-btn { ... }         /* ☰ 버튼 스타일 */
.nav-item { ... }         /* 사이드바 메뉴 항목 */
.nav-item.active { ... }  /* 현재 페이지 활성화 */
```

## 애니메이션

- 사이드바: `transform: translateX(-100% → 0)`, `transition: 0.25s ease`
- 오버레이: `opacity: 0 → 0.55`, `transition: 0.25s ease`
- `isOpen` false 시 `pointer-events: none`으로 인터랙션 차단

## 제외 범위

- 캘린더·뉴스 페이지 실제 콘텐츠 (별도 서브프로젝트)
- 페이지 전환 애니메이션
- 사이드바 상태 localStorage 저장
