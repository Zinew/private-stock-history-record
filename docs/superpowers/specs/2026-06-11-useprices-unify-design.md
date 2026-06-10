# 가격 조회 훅 통합 (usePrices) 설계

**날짜:** 2026-06-11
**목표:** `useStockPrices`(85줄)와 `useKrxPrices`(86줄)의 중복 로직(~95% 동일)을 공통 훅 `usePrices`로 추출하고, 기존 두 훅은 설정만 넘기는 얇은 래퍼(~15줄)로 축소한다. 외부 동작 변경 0.

## 배경

두 훅의 차이는 정확히 4가지뿐이다:

1. 항목 형태: 문자열 티커 vs `{ t, exchange }` 객체
2. fetch 함수: `fetchQuote(ticker)` vs `fetchKrxQuote(t, exchange)`
3. 에러 i18n 키: `holdings.priceError` vs `holdings.krxPriceError`
4. 신규 항목 감지: 문자열 `includes` 비교 vs `h.t` 비교

나머지(순차 fetch + 300ms 간격, 전부 실패 시에만 에러, 3s/6s/12s 백그라운드 재시도, `fetchGenRef` 세대 비교 경합 방지, 신규 항목 추가 시에만 자동 재조회, 상태 관리)는 동일하다. 재시도/폴링은 이 앱에서 버그가 가장 잦았던 영역인데 수정할 때마다 두 파일을 똑같이 고쳐야 한다.

## 선택한 구조

**공통 훅 + 얇은 래퍼 2개** (검토한 대안: 단일 훅으로 교체 — 사용처·테스트 재작성 필요, 통합 단일 호출 — usePortfolio의 USD/KRW 분리까지 흡수해 변경 범위 초과)

### 새 파일: `src/hooks/usePrices.js`

```
usePrices(items, { getKey, fetchItem, errorKey })
```

- `items`: 조회 대상 배열 (형태 무관)
- `getKey(item)`: prices 맵의 키. 신규 항목 감지에도 사용
- `fetchItem(item)`: `Promise<price | null>` 반환. null = 실패
- `errorKey`: 전부 실패 시 `i18n.t(errorKey)`로 에러 설정
- 반환: `{ prices, loading, error, lastUpdatedAt, refresh }` — 현재 두 훅과 동일

내부 로직은 현재 코드를 그대로 이전한다:

- 순차 fetch, 항목 간 `INTER_REQUEST_DELAY`(300ms) 대기
- 첫 패스에서 하나도 성공 못 하면 `setError(i18n.t(errorKey))`, 하나라도 성공하면 prices 병합 + `lastUpdatedAt` 갱신
- 실패 항목은 `RETRY_DELAYS`(3s/6s/12s) 스케줄로 백그라운드 재시도 (스피너 없음, 성공분만 병합)
- `fetchGenRef` 세대 비교: 새 fetch가 시작되면 이전 비동기 흐름은 상태를 건드리지 않고 중단
- 마운트 시 1회 자동 fetch, 이후 `getKey` 기준 **신규 항목이 추가될 때만** 자동 재조회 (항목 제거는 재조회 안 함 — 현재 동작 유지)
- `items.length === 0`이면 fetch 안 함

`config`는 usePrices 내부에서 ref로 보관해 렌더 간 정체성 변화에 영향받지 않는다.

### 래퍼: `src/hooks/useStockPrices.js` (~15줄)

```js
import { usePrices } from './usePrices.js'
import { fetchQuote } from '../utils/finnhub.js'

const CONFIG = {
  getKey: ticker => ticker,
  fetchItem: ticker => fetchQuote(ticker),
  errorKey: 'holdings.priceError',
}

export function useStockPrices(tickers) {
  return usePrices(tickers, CONFIG)
}
```

### 래퍼: `src/hooks/useKrxPrices.js` (~15줄)

```js
import { usePrices } from './usePrices.js'
import { fetchKrxQuote } from '../utils/stockSearch.js'

const CONFIG = {
  getKey: h => h.t,
  fetchItem: h => fetchKrxQuote(h.t, h.exchange),
  errorKey: 'holdings.krxPriceError',
}

export function useKrxPrices(krwHoldings) {
  return usePrices(krwHoldings, CONFIG)
}
```

`CONFIG`는 모듈 레벨 상수 — 렌더마다 새 객체가 만들어지지 않는다.

### 동작 동등성 메모

- 신규 항목 감지 일반화: USD 쪽 `tickers.filter(t => !prev.includes(t))` 와 KRX 쪽 `krwHoldings.some(h => !prevTickers.includes(h.t))` 는 모두 "이전 키 집합에 없는 키가 생겼는가"이므로 `getKey` 비교 하나로 수렴한다. 동작 차이 없음.
- `usePortfolio.js`는 수정하지 않는다. 두 래퍼의 시그니처·반환값이 그대로이기 때문.

## 검증 기준

1. 기존 `src/__tests__/hooks/useStockPrices.test.js`(5개) + `useKrxPrices.test.js`(6개)를 **한 글자도 수정하지 않고** 전부 통과 — 이것이 회귀 기준
2. 전체 `npm test` 203개 통과
3. `npm run build` 성공

## 비범위 (YAGNI)

- 새 테스트 파일 추가 안 함 (기존 테스트가 래퍼를 통해 공통 로직의 성공/실패/재시도/빈 배열 경로를 이미 검증)
- 폴링 주기·재시도 정책 변경, 캐싱, 요청 병렬화 안 함
- usePortfolio 구조 변경 안 함
