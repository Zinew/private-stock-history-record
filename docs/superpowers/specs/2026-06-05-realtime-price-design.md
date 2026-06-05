# Ledger V2 — 미국 주식 실시간 주가 연동 설계

## 개요

미국(USD) 종목에 한해 Finnhub API를 통해 실시간 주가를 조회한다.
한국(KRW) 종목은 기존 수동 입력 방식을 유지한다.
정적 배포(Cloudflare Pages) 환경에서 브라우저가 직접 API를 호출한다.

## 기술 선택

- **API**: Finnhub (`https://finnhub.io/api/v1/quote`)
  - 무료 티어: 60회/분
  - CORS 지원, API 키 필요
  - `/quote` 엔드포인트: 종목당 1회 호출
- **API 키 관리**: Vite 환경변수 `VITE_FINNHUB_KEY` (`.env`, gitignore됨)

## 파일 구조

```
src/
├── utils/
│   └── finnhub.js          # fetchQuote(ticker, apiKey) → number | null
├── hooks/
│   └── useStockPrices.js   # useStockPrices(tickers) → { prices, loading, error, refresh }
├── App.jsx                  # useStockPrices 추가, prices/refresh 하위 전달
└── components/
    └── HoldingsTable.jsx    # ticker blur 자동조회, 새로고침 버튼, 실시간 가격 표시
.env                         # VITE_FINNHUB_KEY=xxx (커밋 제외)
.env.example                 # VITE_FINNHUB_KEY=your_key_here (커밋 포함)
```

## 데이터 모델

holdings 구조 변경 없음:
```js
{ t: string, nm: string, q: number, b: number, c: number, currency: 'USD' | 'KRW' }
// c: 추가 시 저장된 현재가 — API 실패 시 폴백으로 사용
```

실시간 가격은 인메모리 맵으로 관리 (localStorage 미저장):
```js
prices = { AAPL: 195.5, NVDA: 875.2 }
```

## 컴포넌트 설계

### `src/utils/finnhub.js`

```js
// Finnhub /quote 단건 조회. c가 0이면 null 반환.
export async function fetchQuote(ticker, apiKey) { ... }
```

### `src/hooks/useStockPrices.js`

```js
export function useStockPrices(tickers) {
  // tickers: USD 종목 티커 배열
  // 마운트 시 및 refresh() 호출 시 순차 조회 (동시 폭발 방지)
  return { prices, loading, error, refresh }
}
```

- `prices`: `{ [ticker]: number }` 인메모리 맵
- `loading`: 전체 조회 중 여부
- `error`: 조회 실패 메시지 (null이면 정상)
- `refresh()`: 재조회 트리거

### `src/App.jsx` 변경

```js
const usdTickers = holdings.filter(h => h.currency === 'USD').map(h => h.t)
const { prices, loading: priceLoading, error: priceError, refresh } = useStockPrices(usdTickers)

// 실시간 가격이 반영된 holdings 파생 — 모든 하위 컴포넌트에 이것을 전달
const effectiveHoldings = holdings.map(h => ({
  ...h,
  c: h.currency === 'USD' ? (prices[h.t] ?? h.c) : h.c,
}))
```

- `totalVal`, `totalCost`는 `effectiveHoldings` 기준으로 계산
- `Charts`, `HoldingsTable` 모두 `effectiveHoldings`를 받아 `h.c`를 그대로 사용 → 두 컴포넌트 내부 로직 변경 없음
- CRUD (`onAdd`, `onDelete`)는 원본 `holdings` 상태 기준 유지

### `src/components/Charts.jsx` 변경

변경 없음. `effectiveHoldings`를 받으면 파이 차트도 자동으로 실시간 가격 반영.

### `src/components/HoldingsTable.jsx` 변경

**폼 (추가 시):**
- USD 선택 상태에서 티커 필드 blur → `fetchQuote` 단건 호출
- 조회 성공: 현재가 필드 자동 입력 + readonly
- 조회 실패 또는 유효하지 않은 티커: 현재가 필드 비움 + 인라인 에러 메시지
- 조회 중: 현재가 필드에 "조회 중…" 표시
- KRW: 기존 수동 입력 유지

**테이블 헤더:**
```
보유 종목              [↻ 새로고침]  마지막 업데이트: 14:32
```
- USD 종목 없으면 버튼 숨김
- 조회 중 버튼 비활성화

**현재가 셀:**
- 실시간 가격 사용 중: 셀에 작은 초록 dot (●) 표시
- 폴백(h.c) 사용 중: 표시 없음

## 에러 처리

| 상황 | 동작 |
|------|------|
| 로드 시 전체 API 실패 | h.c 폴백 사용, 테이블 상단 "가격 조회 실패" 배너 |
| 로드 시 특정 티커만 실패 | 해당 종목만 h.c 폴백, 나머지 정상 |
| 티커 blur 시 티커 미존재 | 현재가 필드 비움 + "티커를 찾을 수 없습니다" 인라인 에러 |
| Finnhub c: 0 반환 | 유효 가격 아님 → h.c 폴백 |
| API 키 미설정 | 콘솔 경고, 전 종목 수동 모드 폴백 |

## 갱신 전략

- **페이지 로드 시**: USD 종목 전체 순차 조회 (자동)
- **수동 새로고침**: 테이블 헤더 버튼으로 재조회
- KRW 종목: 갱신 대상 아님

## 제외 범위

- 주기적 자동 갱신 (polling)
- KRW 종목 주가 연동
- 매수단가 자동 조회 (항상 수동 입력)
- WebSocket 실시간 스트리밍
