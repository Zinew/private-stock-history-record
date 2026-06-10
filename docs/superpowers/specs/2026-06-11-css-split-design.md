# index.css 분리 리팩토링 설계

**날짜:** 2026-06-11
**목표:** 1,354줄 단일 `src/index.css`를 주제별 10개 파일(`src/styles/` + 진입점)로 분리한다. 클래스명·스타일 동작 변경은 0이다.

## 배경

- 모든 컴포넌트 스타일이 `src/index.css` 한 파일에 있어 UI 작업 때마다 이 파일만 커진다 (최근 모바일 카드뷰 작업에서 +300줄).
- 섹션 주석(`/* ── CalendarPage ── */` 등)이 이미 있어 분리 경계가 명확하다.
- 진입점은 `src/main.jsx`의 `import './index.css'` 하나뿐이다.

## 선택한 방식

**`src/styles/` 폴더 + `@import` 순서 보존** (검토한 대안: 컴포넌트 옆 co-locate — Vite 번들 순서에 따라 캐스케이드 변동 위험, CSS Modules — 전체 className 수정 필요로 변경 범위 과대)

- 평범한 글로벌 CSS 파일을 주제별로 나누고, `src/index.css`가 `@import` 목록으로 순서대로 불러온다.
- `main.jsx`는 수정하지 않는다.
- Vite는 빌드 시 `@import`를 인라인 병합하므로 런타임 요청 증가 없음.

## 파일 매핑

현재 `src/index.css`의 줄 범위 → 새 파일:

| 새 파일 | 내용 (현재 위치) |
|---|---|
| `styles/base.css` | 폰트 `@import url(...)`(1), `:root` 변수(3-15), 리셋(17), body(19-27), `.wrap`(29), `.pos/.neg`(71-72), `.grid` + 840px 미디어쿼리(74-75), `.card`(76-94), footer(223-231) |
| `styles/layout.css` | header(31-40), `.brand`(42-52), `.summary`/`.sum-item`(54-69), currency-toggle(233-254), rate-bar(256-263), 사이드바 전체(354-431), `.menu-btn`(441-453), 언어 토글(827-853), sub-nav(1020-1038), `.header-right`(466 부근) |
| `styles/holdings.css` | `.holdings`(97-103), table/`.table-scroll`/th/td(104-125), `.tick`(126-134), `.edit/.del`(136-158), `.empty`(159), `.addbar`/`.field`(161-193), `.btn`(198-213), holdings-header/refresh/price-error/live-dot/market-badge/ticker-error/auto-label(466-559 중 해당), cash-row(1233-1241), empty state 온보딩(1039-1045), API 재시도 버튼(1046-1059), Transaction History(922-928), AddHoldingForm sell mode(929-933) |
| `styles/modal.css` | `.modal-overlay`/`.modal`/`.modal-field`/`.modal-actions`(267-321), `.modal-title`, search-dropdown(322-352), EditModal 목표비중 행(1331-1348) |
| `styles/charts.css` | `.chart-box`(95), `.snapbar`(215-221), snapshot delete popup(854-891), snapshot undo toast(892-921), BackupBar(934-936) |
| `styles/rebalancing.css` | Rebalancing card(1242-1295), 리밸런싱 모바일 카드(1296-1330) |
| `styles/calendar.css` | CalendarPage 전체(560-728), ManualEventModal type-toggle 포함 |
| `styles/news.css` | NewsPage 전체(729-826) |
| `styles/pages.css` | `.placeholder-page`(455-465), Static pages(937-989), 404(990-1019) |
| `styles/mobile.css` | Mobile card view 전체(1060-1232: 글로벌 `display:none` 기본값 + 640px 미디어쿼리) + 마지막 2x2 stats 미디어쿼리(1349-1354) — **반드시 마지막 import** |

줄 번호는 분리 시점의 안내용이며, 실제 분리는 섹션 주석과 셀렉터를 기준으로 한다. 위 매핑에 빠진 규칙이 발견되면 가장 가까운 주제 파일에 넣되 순서 보존 원칙을 따른다.

## 진입점

`src/index.css`는 아래만 남긴다:

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
@import './styles/mobile.css';
```

폰트 구글 `@import url(...)`은 base.css 최상단으로 이동한다 (CSS 명세상 `@import`는 다른 규칙보다 앞에만 유효).

## 순서 보존 원칙 (핵심 제약)

주제별 재배치로 일부 규칙의 상대 순서가 바뀐다. 동일 셀렉터·동일 특이도 규칙의 순서가 바뀌면 캐스케이드 결과가 달라질 수 있으므로:

1. **분리 전 중복 셀렉터 교차 감사:** 전체 파일에서 동일 셀렉터가 2회 이상 선언된 경우를 스크립트로 찾는다.
2. 중복이 **다른 그룹에 걸쳐** 있으면, 나중 선언이 먼저 선언보다 뒤에 로드되도록 파일 배치를 조정하거나 같은 파일로 모은다.
3. 미디어쿼리 내부 규칙(모바일 오버라이드)은 항상 데스크톱 기본 규칙보다 뒤에 와야 하므로 `mobile.css`를 마지막에 import한다. 단 `.grid`의 840px 쿼리는 원래 위치(base)에 그대로 둔다 — 같은 파일 내 직후 선언이라 순서 문제 없음.

## 검증

1. 중복 셀렉터 감사 결과: 교차 그룹 충돌 0건 (또는 전건 순서 보존 배치 확인)
2. `npm test` — 기존 203개 테스트 전부 통과
3. `npm run build` — 빌드 성공
4. `npm run dev`로 대시보드·캘린더·뉴스·모바일(640px 이하) 뷰 육안 확인 — 분리 전후 화면 동일

## 비범위 (YAGNI)

- 클래스명 변경, 스타일 정리/통합, 죽은 CSS 제거 — 하지 않는다 (이번 작업은 순수 파일 분리)
- CSS Modules / Tailwind 등 도구 전환 — 하지 않는다
- 컴포넌트 JSX 수정 — 하지 않는다
