# usePortfolio 분해 설계

**날짜:** 2026-06-11
**목표:** 215줄 `usePortfolio.js`를 하위 훅 4개(useTransactions/useDisplayCurrency/useLivePrices/useSnapshots) + 파사드로 분해한다. 반환 객체·동작·localStorage 키/포맷 변경 0. 분해 전에 자동 스냅샷 특성화 테스트를 깔아 최대 위험 지점을 고정한다.

## 배경

`src/hooks/usePortfolio.js`(215줄)는 앱의 두뇌로, 6가지 책임이 혼재한다: 거래 관리(CRUD+파생), 가격 조회 조합(USD/KRW), 환율·표시 통화, 평가액 계산, 스냅샷(자산 추이), 일회성 마이그레이션.

- 백로그의 차기 대형 작업(크로스 디바이스 동기화 — localStorage→KV/D1, 다중 포트폴리오)이 전부 이 훅을 관통한다. 경계를 먼저 정리하면 동기화는 useTransactions/useSnapshots의 저장 계층 교체로 좁혀진다.
- **최대 위험 지점:** 자동 스냅샷 기록 effect 2개 (가격 로딩 완료 시점 + 거래 직후). `priceLoading`(가격)·`totalVal`(계산)·`snapAfterTx` ref(거래)를 가로지르는 교차 의존이고, 2026-06-09 스냅샷 소멸 버그 전력이 있는 영역인데 **테스트가 없다**.

기존 테스트: `usePortfolio.test.js` 10개(스냅샷 삭제/복원, 현금, 목표비중) — 자동 기록 경로는 미커버.

## 선택한 구조

**4훅 + 트리거는 파사드** (검토한 대안: useSnapshots가 트리거 effect까지 소유 — 인자 5개+의 두꺼운 인터페이스와 effect 타이밍 변경 위험, 최소 분해(2훅) — 동기화 대비 효과 절반)

### 0단계: 자동 스냅샷 특성화 테스트 (분해 전 작성)

`src/__tests__/usePortfolioSnapshots.test.js` 신규 — `useStockPrices`/`useKrxPrices`를 `vi.mock`으로 제어해 로딩 전환을 시뮬레이션:

1. 가격 로딩 true→false 전환 시 오늘 날짜 스냅샷 1개 기록 (holdings>0, totalVal>0 조건)
2. 같은 날 두 번 기록 시 추가가 아닌 갱신(upsert) — 배열 길이 1 유지, total 갱신
3. 거래 추가 직후 스냅샷 기록 (`snapAfterTx` 경로 — 가격 로딩 전환 없이도)
4. 보유 종목 없으면 기록하지 않음

**분해 전 현재 코드로 통과시킨 뒤, 분해 후 무수정 통과가 회귀 기준.**

### 하위 훅 4개 (모두 `src/hooks/`)

**`useTransactions.js`** (~70줄)
- 반환: `{ transactions, holdings, realizedGains, addTransaction, deleteTransaction, editTransaction, delHolding, editHolding }`
- 소유: `ledger_transactions` 저장, `deriveHoldings`/`deriveRealizedGains` useMemo, `runMigrationIfNeeded()` 모듈 레벨 실행(현 usePortfolio.js 8-24행 이동 — import 시점 실행으로 타이밍 동일)
- `addTransaction`은 `snapAfterTx`를 모른다 — 그 신호는 파사드가 래핑 처리

**`useDisplayCurrency.js`** (~35줄)
- 반환: `{ displayCurrency, exchangeRate, toDisplay, toggleCurrency }`
- 소유: `ledger_display_currency`, `ledger_exchange_rate` 저장, `useExchangeRate(setExchangeRate)` 호출
- `displayCurrency = exchangeRate.rate ? raw : 'USD'` 폴백, `toDisplay` 환산 함수(렌더마다 재생성 — 현재와 동일), `toggleCurrency`(rate 없으면 무시)
- 의존성 없음 — 완전 자급자족

**`useLivePrices.js`** (~40줄)
- 시그니처: `useLivePrices(holdings)`
- 반환: `{ prices, priceLoading, priceError, lastUpdatedAt, refresh, effectiveHoldings }`
- 내부: usdTickers/krwHoldings useMemo 분리, `useStockPrices`/`useKrxPrices` 호출, prices 병합(USD 먼저 spread — 현재와 동일), `priceLoading = usd || krw`, `priceError = usdError || krwError || null`, `refresh = () => { refreshUsd(); refreshKrw() }`, `effectiveHoldings`(현재가 폴백 `prices[h.t] ?? h.b ?? 0`)

**`useSnapshots.js`** (~50줄)
- 반환: `{ snaps, upsertTodaySnap, clearSnaps, deleteSnap, restoreSnap }`
- 소유: `ledger_snaps` 저장
- `upsertTodaySnap(total, currency)`: `!(total > 0)` 가드 유지, 오늘 날짜 upsert, 60개 제한 — 현 132-147행 로직 그대로. 단 `holdings.length === 0` 가드는 제거하고 파사드 effect의 기존 중복 가드만 남긴다 (이 함수는 내부 전용이며 모든 호출 경로가 파사드 가드를 먼저 통과하므로 동작 동일)
- `clearSnaps`(window.confirm 포함), `deleteSnap`, `restoreSnap` 그대로 이동

### 파사드 `usePortfolio.js` (~80줄)

남는 것:
- `ledger_cash`, `ledger_target_weights` 저장 (+ `setTargetWeight` 로직)
- 4훅 조합: `const tx = useTransactions()`, `const cur = useDisplayCurrency()`, `const live = useLivePrices(tx.holdings)`, `const snap = useSnapshots()`
- 평가액 계산: holdingsVal/totalVal/totalCost/pl/ret/totalRealizedGain (현재 71-80행 그대로)
- **자동 스냅샷 트리거 effect 2개 — 로직 무변경 잔류** (prevPriceLoading ref + snapAfterTx ref 포함)
- `addTransaction` 래핑: `tx.addTransaction(args)` 호출 후 `snapAfterTx.current = true`
- **반환 객체의 키·의미 완전 동일** → DashboardPage 등 사용처·기존 테스트 무수정

## 검증 기준

1. 특성화 테스트 4개: **분해 전 통과 확인 → 분해 후 무수정 통과**
2. 기존 217개 테스트 무수정 전부 통과 (총 221)
3. `npm run build` 성공
4. dev 서버 육안: 대시보드(평가액·가격·차트), 거래 추가/삭제, 통화 전환, 스냅샷 차트 정상

## 비범위 (YAGNI)

- localStorage 키·데이터 포맷 변경 없음
- 스냅샷 정책(하루 1개 upsert, 60개 제한) 변경 없음
- 동기화 대비 저장소 추상화 레이어 추가 없음 — 경계 정리만
- 하위 훅별 개별 테스트 신설 없음 (특성화 테스트 + 기존 테스트가 파사드 경유로 커버; 동기화 작업 때 필요해지면 그때 추가)
