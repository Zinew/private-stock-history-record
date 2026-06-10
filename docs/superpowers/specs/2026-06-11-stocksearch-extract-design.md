# AddHoldingForm 검색 로직 추출 설계

**날짜:** 2026-06-11
**목표:** 231줄 `AddHoldingForm.jsx`에서 종목 검색 로직을 `useStockSearch` 훅 + `StockSearchField` 표현 컴포넌트로 추출한다. 검색 UX·DOM·CSS 변경 0. 미커버였던 검색 로직에 훅 테스트를 신설한다.

## 배경

`src/components/AddHoldingForm.jsx`(231줄)에 검색 로직(디바운스 300ms, KRX/USD 동시 검색, 결과 병합·8개 제한, 드롭다운 상태)과 매수/매도 폼 로직이 혼재한다. 검색 관련 상태 4개(`searchResults`, `searchOpen`, `debounceRef`, `priceLoading`)와 폼 상태가 얽혀 있고, 제출·매도 전환 시 검색 상태를 수동으로 리셋하는 코드가 3곳에 반복된다.

테스트 현황: `stockSearch.js` API 유틸은 테스트가 있으나 **검색 UX 로직(디바운스·병합·드롭다운)은 직접 테스트가 없다**. 추출하면서 훅 테스트를 신설해 안전망을 만든다.

## 선택한 구조

**훅(부모 소유) + 표현 컴포넌트** (검토한 대안: 훅을 필드에 내장 — 제출/매도 전환 시 부모가 검색 상태를 리셋할 방법이 없어 stale 드롭다운 위험, 훅만 추출 — 드롭다운 UI 관리가 폼에 남음, 풀 분해(Buy/Sell 폼까지) — 단순 필드 나열이라 실익 적음)

### 새 훅: `src/hooks/useStockSearch.js` (~45줄)

```
useStockSearch() → { results, open, search, clear, close }
```

- `search(query)`: 디바운스 300ms 후 `fetchKrxSearch(query)` + `fetchUsdSearch(query)` 동시 호출(`Promise.all`). 결과는 KRX 먼저, market 매핑(`KS`→`KOSPI`, `KQ`→`KOSDAQ`, USD→`US`), 합쳐서 8개 제한. 결과가 있으면 `open=true`. 빈 쿼리(`!query.trim()`)면 즉시 결과 비움 + 닫기 (API 미호출)
- `clear()`: 대기 중 디바운스 취소 + `results=[]` + `open=false`
- `close()`: `open=false`만 (input blur용)
- 언마운트 시 디바운스 타이머 정리 (`useEffect` cleanup)
- `search`/`clear`/`close`는 `useCallback`으로 정체성 안정화

로직은 현재 `handleNameChange`(26-43행)의 디바운스 블록을 그대로 이전한다 — 디바운스 시간, 병합 순서, slice(0, 8), `setSearchOpen(all.length > 0)` 모두 동일.

### 새 컴포넌트: `src/components/StockSearchField.jsx` (~40줄, 표현 전용)

props: `{ value, onQueryChange, onSelect, results, open, onClose, label, badge, placeholder }`

- 현재 `.field.nm` 블록(158-181행)과 동일한 DOM: label(+badge), input(`autoComplete="off"`, `onChange` → `onQueryChange(값)`, `onBlur` → `setTimeout(onClose, 150)`), 드롭다운(`open && results.length > 0`일 때, 항목 클릭 → `onSelect(item)`)
- 상태 없음. 클래스명(`field nm`, `search-dropdown`, `search-dropdown-item`, `search-item-name`, `search-item-meta`) 무변경
- `badge`는 ReactNode — 현재의 선택 종목 market-badge + 로딩 표시를 부모가 조립해 넘김

### 수정: `src/components/AddHoldingForm.jsx` (231 → ~150줄)

- 제거: `searchResults`/`searchOpen` 상태, `debounceRef`, 디바운스 cleanup effect, 드롭다운 JSX
- `const search = useStockSearch()` 호출
- `handleNameChange(val)`: 폼 리셋(`name: val, ticker: '', ...`) + `search.search(val)` — 시그니처가 이벤트가 아닌 값을 받도록 변경 (StockSearchField가 값을 넘김)
- `handleSelect(item)`: `search.clear()` 후 기존 로직 그대로 — 폼 채우기, 시세 조회(`fetchKrxQuote`/`fetchQuote`), stale 가드(`f.ticker !== item.ticker`), `priceLoading` 상태는 폼 관심사라 **AddHoldingForm에 유지**
- `handleBuySubmit`: 기존 수동 리셋 3줄(`setSearchResults([]); setSearchOpen(false); clearTimeout(...)`) → `search.clear()`
- 매도 전환 토글: 동일하게 `search.clear()`로 대체
- 매수 분기에서 `<StockSearchField value={form.name} onQueryChange={handleNameChange} onSelect={handleSelect} results={search.results} open={search.open} onClose={search.close} label={...} badge={...} placeholder="삼성전자 · Apple · AAPL · 005930" />`

### 동작 동등성 메모

- 검색 입력→드롭다운→선택→시세 자동 입력 흐름의 타이밍(300ms 디바운스, blur 150ms 지연 닫기)과 데이터(병합 순서, market 라벨, 8개 제한) 모두 무변경
- 매도 모드 전환 시 매수 분기가 언마운트되어도, 훅이 부모에 있으므로 `clear()` 호출로 결정적으로 리셋 (현재 동작과 동일)

## 신규 테스트: `src/__tests__/hooks/useStockSearch.test.js`

`vi.mock`으로 `stockSearch.js` 유틸 모킹 + `vi.useFakeTimers`:

1. 빈/공백 쿼리 → 결과 비움·`open=false`·API 미호출
2. 연속 `search()` 호출(타이핑 시뮬레이션) → 디바운스로 마지막 쿼리만 1회 검색
3. KRX+USD 병합: KRX 먼저, market 매핑(KOSPI/KOSDAQ/US), 합계 8개 제한
4. 두 검색 모두 결과 0개 → `open=false` 유지
5. `clear()`가 대기 중 디바운스 취소 (타이머 경과 후에도 API 미호출)

## 검증 기준

1. 신규 `useStockSearch.test.js` 통과
2. 기존 203개 테스트 **무수정** 전부 통과 (총 203 + 신규)
3. `npm run build` 성공
4. dev 서버 육안 확인: 검색→드롭다운→선택→시세 자동입력→매수 추가, 매도 전환 리셋 (직접 상호작용 테스트가 없던 영역이므로 육안 확인 포함)

## 비범위 (YAGNI)

- 매수/매도 폼 컴포넌트 분리 안 함
- 검색 UX(디바운스 시간, 결과 수, 정렬)·DOM·CSS 변경 없음
- AddHoldingForm 상호작용 테스트(제출 등) 신설 안 함 — 훅 테스트만
- stockSearch.js API 유틸 변경 없음
