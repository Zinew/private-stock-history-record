# UX 개선 설계 문서

**작성일: 2026-06-08**

## 목표

4가지 UX 개선을 일괄 적용한다.

1. 입력 폼 글래스모피즘 스타일
2. 빈 상태 온보딩 UI
3. API 에러 재시도 버튼
4. 수익/손실 ▲▼ 아이콘

---

## 1. 입력 폼 글래스모피즘

### 현재
- 배경: `var(--panel)` = `#141816` (불투명 단색)
- 테두리: `1px solid var(--line)` = `#27302c`
- border-radius: `8px`
- 흰 배경 input이 일부 팝업에 잔존

### 변경
모든 input/select에 글래스모피즘 스타일 적용:

```css
/* 기본 상태 */
background: rgba(39, 48, 44, 0.4);
border: 1px solid rgba(127, 209, 174, 0.15);
border-radius: 10px;

/* 포커스 상태 */
border-color: rgba(127, 209, 174, 0.5);
box-shadow: 0 0 0 3px rgba(127, 209, 174, 0.1), inset 0 1px 0 rgba(255,255,255,0.03);
```

### 적용 대상 CSS 선택자
- `.field input`, `.field select`
- `.field input:focus`, `.field select:focus`
- `.modal-field input`, `.modal-field select`
- `select` (전역 — CalendarPage 드롭다운 포함)

---

## 2. 빈 상태 온보딩 UI

### 현재
`HoldingsTable.jsx`에서 holdings가 0개일 때 단순 텍스트만 표시.

### 변경
`HoldingsTable.jsx`의 빈 상태를 센터 패널로 교체:

```jsx
<div className="empty-state">
  <span className="empty-state-icon">📈</span>
  <h3 className="empty-state-title">{t('holdings.emptyTitle')}</h3>
  <p className="empty-state-desc">{t('holdings.emptyDesc')}</p>
  <button className="btn empty-state-cta" onClick={onScrollToForm}>
    {t('holdings.addFirst')}
  </button>
</div>
```

`HoldingsTable` 내부에 `addbarRef = useRef(null)`을 두고 `.addbar` div에 연결. CTA 버튼 클릭 시 `addbarRef.current?.scrollIntoView({ behavior: 'smooth' })`.

### 신규 i18n 키
```json
"holdings": {
  "emptyTitle": "포트폴리오를 시작해보세요",
  "emptyDesc": "종목을 추가하면 실시간 가격과 수익률을 한눈에 확인할 수 있어요."
}
```
(EN: "Start your portfolio" / "Add a holding to track live prices and returns.")

### 신규 CSS
```css
.empty-state { text-align: center; padding: 48px 20px; }
.empty-state-icon { font-size: 36px; display: block; margin-bottom: 14px; }
.empty-state-title { font-size: 15px; color: var(--ink); margin-bottom: 8px; }
.empty-state-desc { font-size: 13px; color: var(--ink-dim); line-height: 1.6; margin-bottom: 20px; }
.empty-state-cta { margin: 0 auto; }
```

---

## 3. API 에러 재시도 버튼

### 적용 위치 3곳

#### A. HoldingsTable — 주가 에러
`priceError` 표시 div에 재시도 버튼 추가. `onRefresh` prop 재사용.

```jsx
{priceError && (
  <div className="price-error">
    ⚠ {priceError}
    <button className="btn-retry" onClick={onRefresh}>↺ {t('common.retry')}</button>
  </div>
)}
```

#### B. NewsPage — 종목별 뉴스 에러
`useStockNews` 훅에 `retry` 콜백 추가:

```js
// useStockNews.js
const [retryCount, setRetryCount] = useState(0)
const retry = useCallback(() => setRetryCount(c => c + 1), [])
// effect deps에 retryCount 추가
return { articles, loading, error, retry }
```

NewsPage 에러 표시:
```jsx
{error && (
  <p className="news-error">
    ⚠ {error}
    <button className="btn-retry" onClick={retry}>↺ {t('common.retry')}</button>
  </p>
)}
```

#### C. CalendarPage — 실적 일정 에러
`useCalendarEvents` 훅에 동일한 `retryCount` 패턴으로 `retry` 추가. CalendarPage 에러 표시에 버튼 추가.

### 신규 i18n 키
```json
"common": { "retry": "재시도" }
```
(EN: "Retry")

### 신규 CSS
```css
.btn-retry {
  background: transparent;
  border: 1px solid #e8654f;
  color: #e8654f;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 11px;
  cursor: pointer;
  margin-left: 10px;
  vertical-align: middle;
}
.btn-retry:hover { background: rgba(232, 101, 79, 0.1); }
```

---

## 4. 수익/손실 ▲▼ 아이콘

### 현재
`pct(n)` → `"+12.34%"` / `"-5.20%"` (부호 기호 사용)

### 변경
`format.js`에 `pctArrow(n)` 함수 추가:

```js
export function pctArrow(n) {
  if (!isFinite(n) || n === 0) return pct(n)
  const abs = Math.abs(n).toFixed(2)
  return n > 0 ? `▲ ${abs}%` : `▼ ${abs}%`
}
```

금액에도 동일 패턴 적용을 위한 `fmtArrow(n, currency)` 추가:

```js
export function fmtArrow(n, currency) {
  if (!isFinite(n) || n === 0) return fmtCurrency(n, currency)
  const abs = fmtCurrency(Math.abs(n), currency)
  return n > 0 ? `▲ ${abs}` : `▼ ${abs}`
}
```

### 적용 위치
- `HoldingsTable.jsx` — 종목별 수익률(%), 손익 금액
- `Header.jsx` — 전체 수익률(%), 총 손익 금액
- `Charts.jsx` — 실현손익 표시 (있을 경우)

기존 `pct()` 호출은 유지 (다른 맥락에서 사용 중). 이익/손실을 표시하는 곳만 `pctArrow` / `fmtArrow`로 교체.

---

## 파일 구조

```
수정:
  src/index.css                   — 글래스모피즘 input 스타일, empty-state, btn-retry CSS
  src/utils/format.js             — pctArrow(), fmtArrow() 추가
  src/components/HoldingsTable.jsx — 빈 상태 온보딩, 재시도 버튼
  src/hooks/useStockNews.js       — retryCount + retry 추가
  src/pages/NewsPage.jsx          — 재시도 버튼 표시
  src/hooks/useCalendarEvents.js  — retryCount + retry 추가
  src/pages/CalendarPage.jsx      — 재시도 버튼 표시
  src/locales/ko.json             — 신규 i18n 키
  src/locales/en.json             — 신규 i18n 키
  src/components/Header.jsx       — pctArrow/fmtArrow 적용
```

## 테스트 계획

1. input 포커스 시 글래스 glow 확인
2. 보유 종목 0개 상태에서 온보딩 패널 확인, CTA 버튼 클릭 시 폼으로 스크롤
3. 네트워크 차단 후 주가/뉴스/캘린더 에러 → 재시도 버튼 노출 확인
4. 재시도 버튼 클릭 → 로딩 후 데이터 재조회 확인
5. 수익/손실 수치에 ▲▼ 아이콘 표시 확인 (양수/음수/0 케이스)
6. KO/EN 전환 시 신규 문자열 확인
