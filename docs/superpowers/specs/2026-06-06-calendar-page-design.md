# Design: CalendarPage 실적·이벤트 데이터 연동

**Date:** 2026-06-06  
**Scope:** CalendarPage 신규 기능 — USD 종목 실적/배당 이벤트 리스트 표시

---

## Goal

CalendarPage를 실제 데이터로 채운다. 보유 USD 종목의 향후 90일 실적발표(earnings)와 배당 기준일(dividend)을 Finnhub API로 가져와 날짜순 리스트로 표시한다. KRW 종목은 이번 범위에서 제외하고 안내 문구만 표시한다.

---

## Architecture

```
App.jsx
  └─ usePortfolio()  →  portfolio (기존)
  └─ <CalendarPage portfolio={portfolio} />  (prop 추가)

CalendarPage.jsx
  └─ useCalendarEvents(portfolio.holdings)  (NEW)
      ├─ USD 종목만 필터
      ├─ 종목별 병렬 호출 (Promise.all):
      │    • GET /stock/earnings-calendar?symbol=&from=&to=&token=
      │    • GET /stock/dividend?symbol=&from=&to=&token=
      └─ 통합 → 날짜순 정렬 → events[] 반환
```

---

## Files

| Action | File | Change |
|--------|------|--------|
| Create | `src/hooks/useCalendarEvents.js` | 이벤트 fetch 훅 |
| Modify | `src/pages/CalendarPage.jsx` | 데이터 연동 + 리스트 UI |
| Modify | `src/App.jsx` | CalendarPage에 portfolio prop 추가 |

---

## `useCalendarEvents` Hook

### Signature

```js
useCalendarEvents(holdings)
// returns: { events, loading, error }
```

### Event Object

```js
{
  date: '2026-06-10',      // YYYY-MM-DD, 정렬 기준
  type: 'earnings',        // 'earnings' | 'dividend'
  ticker: 'AAPL',
  name: 'Apple Inc.',      // h.nm (보유 종목명, 없으면 ticker)
  epsEstimate: 1.58,       // earnings만, 없으면 null
  amount: 0.75,            // dividend만 (주당 배당금 USD)
}
```

### Fetch Logic

- USD 종목 필터: `holdings.filter(h => (h.currency ?? 'USD') === 'USD')`
- 조회 기간: 오늘 ~ +90일 (YYYY-MM-DD 포맷)
- 종목별 Promise.all → 전체 종목도 Promise.all (동시 호출)
- Finnhub base URL: `https://finnhub.io/api/v1`
- API 키: `import.meta.env.VITE_FINNHUB_KEY` (기존 패턴 동일)
- 에러: 개별 종목 fetch 실패는 무시하고 성공한 것만 표시. 전체 실패 시 error 상태.
- holdings 빈 배열이면 즉시 `{ events: [], loading: false, error: null }` 반환

### Finnhub Endpoints

```
GET /stock/earnings-calendar?symbol={ticker}&from={from}&to={to}&token={key}
Response: { earningsCalendar: [{ date, epsEstimate, symbol, ... }] }

GET /stock/dividend?symbol={ticker}&from={from}&to={to}&token={key}
Response: [{ exDividendDate, amount, symbol, ... }]
```

---

## CalendarPage UI

### Layout

```
─────────────────────────────────────
  실적·이벤트 캘린더
─────────────────────────────────────

  [loading] 조회 중…
  [error]   .price-error 배너 재사용

  2026-06-10
  ┌───────────────────────────────┐
  │  실적  AAPL  Apple Inc.       │
  │  예상 EPS: $1.58              │
  └───────────────────────────────┘

  2026-06-15
  ┌───────────────────────────────┐
  │  배당  MSFT  Microsoft        │
  │  $0.75 / 주                   │
  └───────────────────────────────┘

  * 한국 종목 이벤트는 추후 지원 예정입니다.
─────────────────────────────────────
```

### States

- **로딩:** "조회 중…" 텍스트
- **에러:** 기존 `.price-error` CSS 클래스 재사용
- **이벤트 없음:** "향후 90일 내 예정된 이벤트가 없습니다."
- **정상:** 날짜 헤더 + 이벤트 카드 리스트

### Event Card

- 뱃지: `실적` / `배당` (텍스트 레이블, 이모지 없음)
- 날짜 헤더: 날짜가 바뀔 때만 표시 (그룹핑)
- 종목명: `h.nm` 있으면 표시, 없으면 ticker만

---

## CSS

기존 `src/index.css`에 클래스 추가:

```css
.calendar-event-list { ... }   /* 리스트 컨테이너 */
.calendar-date-header { ... }  /* 날짜 헤더 */
.calendar-card { ... }         /* 이벤트 카드 */
.calendar-badge { ... }        /* 실적/배당 뱃지 */
.calendar-badge.earnings { ... }
.calendar-badge.dividend { ... }
```

---

## Out of Scope

- KRW 종목 실적/배당 데이터 연동
- 과거 이벤트 표시 (오늘 이후만)
- 이벤트 상세 팝업
- 새로고침 버튼 (페이지 진입 시 1회 fetch)

---

## Success Criteria

1. 보유 USD 종목의 향후 90일 실적·배당 이벤트가 날짜순으로 표시된다
2. 로딩/에러/빈 상태가 적절히 처리된다
3. 기존 96개 테스트 전체 통과
4. KRW 종목 안내 문구가 하단에 표시된다
