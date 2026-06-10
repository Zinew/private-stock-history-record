# usePrices 가격 조회 훅 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `useStockPrices`/`useKrxPrices`의 중복 로직을 공통 훅 `usePrices`로 추출하고 두 훅을 얇은 래퍼로 축소한다. 외부 동작 변경 0.

**Architecture:** `usePrices(items, { getKey, fetchItem, errorKey })`가 순차 fetch(300ms 간격)·백그라운드 재시도(3s/6s/12s)·세대 기반 경합 방지·신규 항목 감지를 전부 담당. 래퍼는 모듈 레벨 CONFIG 상수만 넘긴다. 회귀 기준은 기존 훅 테스트 11개를 **무수정** 통과시키는 것.

**Tech Stack:** React hooks, Vitest + @testing-library/react (renderHook), react-i18next

**Spec:** `docs/superpowers/specs/2026-06-11-useprices-unify-design.md`

---

### Task 1: usePrices 공통 훅 생성 + useStockPrices 래퍼 전환

**Files:**
- Create: `src/hooks/usePrices.js`
- Modify: `src/hooks/useStockPrices.js` (85줄 → 전체 교체, ~13줄)
- Test: `src/__tests__/hooks/useStockPrices.test.js` (**수정 금지** — 무수정 통과가 회귀 기준)

- [ ] **Step 1: usePrices.js 작성**

`src/hooks/usePrices.js`를 아래 내용 그대로 생성한다. 이 코드는 기존 `useStockPrices.js`의 로직을 항목/키/fetch/에러키만 일반화한 것이다 (로직 변경 없음):

```js
import { useState, useCallback, useEffect, useRef } from 'react'
import i18n from '../i18n.js'

const INTER_REQUEST_DELAY = 300  // ms between sequential item fetches
const RETRY_DELAYS = [3000, 6000, 12000]  // background retry schedule (ms)

// 공통 가격 조회 훅.
//   items:     조회 대상 배열 (형태 무관)
//   getKey:    item → prices 맵의 키 (신규 항목 감지에도 사용)
//   fetchItem: item → Promise<price | null> (null = 실패)
//   errorKey:  첫 패스 전부 실패 시 사용할 i18n 키
export function usePrices(items, config) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const itemsRef = useRef(items)
  const prevKeysRef = useRef([])
  const hasFetchedRef = useRef(false)
  const fetchGenRef = useRef(0)
  const configRef = useRef(config)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { configRef.current = config }, [config])

  const fetchAll = useCallback(() => {
    const gen = ++fetchGenRef.current
    const list = itemsRef.current
    const { getKey, fetchItem, errorKey } = configRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      let failed = []
      try {
        const result = {}
        for (let i = 0; i < list.length; i++) {
          const item = list[i]
          const price = await fetchItem(item)
          if (price !== null) result[getKey(item)] = price
          else failed.push(item)
          if (i < list.length - 1) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY))
        }
        if (gen !== fetchGenRef.current) return
        if (Object.keys(result).length === 0) {
          setError(i18n.t(errorKey))
        } else {
          setPrices(prev => ({ ...prev, ...result }))
          setLastUpdatedAt(new Date())
        }
      } finally {
        if (gen === fetchGenRef.current) setLoading(false)
      }

      // Background retry — no loading spinner, silently fills in failed items
      for (const delay of RETRY_DELAYS) {
        if (gen !== fetchGenRef.current || failed.length === 0) break
        await new Promise(r => setTimeout(r, delay))
        if (gen !== fetchGenRef.current) break
        const retryResult = {}
        const nextFailed = []
        for (let i = 0; i < failed.length; i++) {
          const item = failed[i]
          const price = await fetchItem(item)
          if (price !== null) retryResult[getKey(item)] = price
          else nextFailed.push(item)
          if (i < failed.length - 1) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY))
        }
        if (gen !== fetchGenRef.current) break
        if (Object.keys(retryResult).length > 0) {
          setPrices(prev => ({ ...prev, ...retryResult }))
          setLastUpdatedAt(new Date())
        }
        failed = nextFailed
      }
    })()
  }, [])

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      prevKeysRef.current = items.map(configRef.current.getKey)
      fetchAll()
      return
    }
    const keys = items.map(configRef.current.getKey)
    const hasNew = keys.some(k => !prevKeysRef.current.includes(k))
    prevKeysRef.current = keys
    if (hasNew) fetchAll()
  }, [items, fetchAll])

  return { prices, loading, error, lastUpdatedAt, refresh: fetchAll }
}
```

원본 대비 일반화 포인트 (검토 시 참고):
- `tickersRef`/`holdingsRef` → `itemsRef`
- `fetchQuote(ticker)`/`fetchKrxQuote(t, exchange)` → `fetchItem(item)`
- `result[ticker]`/`result[t]` → `result[getKey(item)]`
- 신규 항목 감지: 두 훅의 문자열 비교/`h.t` 비교 → `getKey` 결과 비교 (의미 동일)
- 에러 키 하드코딩 → `errorKey` 파라미터

- [ ] **Step 2: useStockPrices.js 전체 교체**

`src/hooks/useStockPrices.js`의 내용을 아래로 **전체 교체**한다:

```js
import { usePrices } from './usePrices.js'
import { fetchQuote } from '../utils/finnhub.js'

// 미국 주식 (Finnhub) 가격 조회 — 공통 로직은 usePrices 참고
const CONFIG = {
  getKey: ticker => ticker,
  fetchItem: ticker => fetchQuote(ticker),
  errorKey: 'holdings.priceError',
}

export function useStockPrices(tickers) {
  return usePrices(tickers, CONFIG)
}
```

- [ ] **Step 3: 기존 테스트 무수정 통과 확인**

Run: `npx vitest run src/__tests__/hooks/useStockPrices.test.js`
Expected: 5 tests PASS. 실패 시 usePrices.js와 원본 로직(git: `git show HEAD:src/hooks/useStockPrices.js`)을 비교해 일반화 과정의 누락을 찾는다 — 테스트 파일은 절대 수정하지 않는다.

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/usePrices.js src/hooks/useStockPrices.js
git commit -m "refactor: usePrices 공통 훅 추출, useStockPrices를 래퍼로 전환"
```

---

### Task 2: useKrxPrices 래퍼 전환 + 전체 검증

**Files:**
- Modify: `src/hooks/useKrxPrices.js` (86줄 → 전체 교체, ~13줄)
- Test: `src/__tests__/hooks/useKrxPrices.test.js` (**수정 금지**)

- [ ] **Step 1: useKrxPrices.js 전체 교체**

`src/hooks/useKrxPrices.js`의 내용을 아래로 **전체 교체**한다:

```js
import { usePrices } from './usePrices.js'
import { fetchKrxQuote } from '../utils/stockSearch.js'

// 한국 주식 (KRX, Naver 프록시) 가격 조회 — 공통 로직은 usePrices 참고
const CONFIG = {
  getKey: h => h.t,
  fetchItem: h => fetchKrxQuote(h.t, h.exchange),
  errorKey: 'holdings.krxPriceError',
}

export function useKrxPrices(krwHoldings) {
  return usePrices(krwHoldings, CONFIG)
}
```

- [ ] **Step 2: 기존 테스트 무수정 통과 확인**

Run: `npx vitest run src/__tests__/hooks/useKrxPrices.test.js`
Expected: 6 tests PASS (실패 항목 재시도 테스트 포함). 실패 시 테스트 파일을 고치지 말고 usePrices 일반화 누락을 찾는다.

- [ ] **Step 3: 전체 테스트**

Run: `npm test`
Expected: 203 tests PASS (변경 전과 동일 개수 — 테스트 추가/삭제 없음)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useKrxPrices.js
git commit -m "refactor: useKrxPrices를 usePrices 래퍼로 전환 — 중복 제거 완료"
```
