# KRX 실시간 주가 연동 — Design Spec

**Date:** 2026-06-05  
**Status:** Approved

## Overview

KRW 종목 추가 시 이름 검색으로 종목을 선택하고, 선택된 종목의 현재가를 Yahoo Finance API를 통해 자동 조회한다. Cloudflare Pages Functions를 프록시로 사용해 CORS 제약을 우회한다.

## 변경 파일

| 파일 | 유형 |
|---|---|
| `functions/api/krx-search.js` | 신규 |
| `functions/api/krx-quote.js` | 신규 |
| `src/utils/krx.js` | 신규 |
| `src/hooks/useKrxPrices.js` | 신규 |
| `src/components/HoldingsTable.jsx` | 수정 |
| `src/App.jsx` | 수정 |

## Holding 스키마 변경

```js
// 기존 KRW holding
{ t: '005930', nm: '삼성전자', q: 10, b: 75000, c: 82000, currency: 'KRW' }

// 신규 KRW holding (exchange 필드 추가)
{ t: '005930', nm: '삼성전자', q: 10, b: 75000, c: 82000, currency: 'KRW', exchange: 'KS' }
```

- `exchange`: `'KS'` (KOSPI) | `'KQ'` (KOSDAQ) | undefined
- `exchange` 없는 기존 KRW holdings → 수동 입력값 유지 (하위 호환)
- `exchange` 있는 KRW holdings → 자동 조회 대상

## Cloudflare Pages Functions

### `functions/api/krx-search.js`

- **요청:** `GET /api/krx-search?q={query}`
- **내부:** `https://query1.finance.yahoo.com/v1/finance/search?q={query}&lang=ko-KR&region=KR` 프록시
- **응답:**
```json
[
  { "symbol": "005930.KS", "name": "삼성전자", "ticker": "005930", "exchange": "KS" },
  { "symbol": "006400.KS", "name": "삼성SDI", "ticker": "006400", "exchange": "KS" }
]
```
- KRX 종목만 필터링 (symbol이 `.KS` 또는 `.KQ`로 끝나는 것)
- 오류 시 빈 배열 반환

### `functions/api/krx-quote.js`

- **요청:** `GET /api/krx-quote?symbol={ticker}.{exchange}` (예: `005930.KS`)
- **내부:** `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d` 프록시
- **응답:**
```json
{ "price": 329000 }
```
- `regularMarketPrice` 값 추출
- 오류 또는 데이터 없음 시 `{ "price": null }` 반환

## 클라이언트 유틸리티

### `src/utils/krx.js`

```js
export async function fetchKrxSearch(query)
// /api/krx-search?q={query} 호출
// 반환: { symbol, name, ticker, exchange }[] | []

export async function fetchKrxQuote(ticker, exchange)
// /api/krx-quote?symbol={ticker}.{exchange} 호출
// 반환: number | null
```

- 로컬 개발 시(`npm run dev`): Functions 없음 → `null`/`[]` 반환 (graceful fallback)
- 실제 동작은 Cloudflare Pages 배포 환경에서 확인

### `src/hooks/useKrxPrices.js`

`useStockPrices`와 동일한 인터페이스, `fetchKrxQuote(t, exchange)` 호출.

```js
export function useKrxPrices(krwHoldings)
// krwHoldings: { t, exchange }[]
// 반환: { prices, loading, error, lastUpdatedAt, refresh }
// prices 키: ticker (예: '005930')
```

- 앱 로드 시 exchange 있는 KRW 종목 전체 순차 조회
- 새 KRW 종목 추가 시 자동 트리거
- refresh 버튼 공유 (USD와 별도 관리)

## HoldingsTable UX 변경

### KRW 이름 검색 typeahead

- KRW 선택 시 이름 필드가 검색 인풋으로 동작
- 타이핑 후 300ms debounce → `/api/krx-search` 호출
- 드롭다운 결과: `종목명 · 티커 · 거래소`
- 선택 시: `ticker`, `nm`, `exchange` 자동 입력
- 티커 필드는 자동 입력 후 readOnly 표시 (수동 입력 불필요)
- USD 선택 시: 기존 동작 유지 (이름 필드 자유 입력, 티커 blur 시 가격 조회)

### KRW 현재가 자동 조회

- 종목 선택 후 `fetchKrxQuote`로 현재가 자동 입력 (USD blur 방식과 동일)
- live 인디케이터 `●` (초록): KRW 종목도 `exchange` 있고 live price 있으면 표시

## App.jsx 변경

```js
// KRX 가격 훅 추가
const krwHoldings = useMemo(
  () => holdings.filter(h => h.currency === 'KRW' && h.exchange).map(h => ({ t: h.t, exchange: h.exchange })),
  [holdings]
)
const { prices: krwPrices, loading: krwLoading, error: krwError, lastUpdatedAt: krwUpdatedAt, refresh: refreshKrw } = useKrxPrices(krwHoldings)

// 가격 합산
const prices = { ...usdPrices, ...krwPrices }

// effectiveHoldings: USD + KRW(with exchange) 모두 live price 반영
const effectiveHoldings = holdings.map(h => ({
  ...h,
  c: prices[h.t] !== undefined ? prices[h.t] : h.c,
}))
```

- `priceLoading`, `priceError`, `lastUpdatedAt`: USD와 KRW 중 활성 상태 합산
- refresh 버튼: `onRefresh` 시 USD와 KRW 모두 재조회

## 오류 처리

| 상황 | 동작 |
|---|---|
| 검색 결과 없음 | 드롭다운에 "결과 없음" 표시 |
| 검색 API 오류 | 드롭다운 닫힘, 수동 입력 가능 |
| 가격 조회 실패 | 저장된 `c` 값(수동 입력) 폴백 |
| 로컬 개발 환경 | Functions 없음 → null 반환, 수동 입력 유지 |

## Out of Scope

- KOSPI/KOSDAQ 수동 선택 UI (검색으로 자동 해결)
- 기존 KRW holdings `exchange` 필드 자동 채우기 (migration 없음, 수동 재추가 필요)
- KRW refresh 버튼 별도 분리 (USD 버튼과 공유)
- 실시간 WebSocket 스트리밍 (polling 방식 유지)
