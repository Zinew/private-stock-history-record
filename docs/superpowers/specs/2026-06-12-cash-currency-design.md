# 현금 통화 기준 고정 설계

**날짜:** 2026-06-12
**목표:** 현금을 `{ amount, currency }`로 저장하고 보유 주식처럼 환산해, 표시 통화 전환 시 현금의 의미가 바뀌는 버그를 고친다. 입력 통화는 현금 수정 모달의 KRW/USD 토글로 명시한다 (사용자 결정).

## 배경 (버그)

`ledger_cash`가 통화 정보 없는 숫자로 저장되고 `totalVal = holdingsVal + cash`로 환산 없이 더해짐. 표시 통화를 KRW→USD로 바꾸면 ₩1,000,000이 $1,000,000로 둔갑. 보유 주식은 `toDisplay(금액, 보유통화)`로 환산되는데 현금만 예외였음.

## 변경 내용

### 1. 저장 형식

`ledger_cash`: `number` → `{ amount: number, currency: 'USD' | 'KRW' }`

### 2. 마이그레이션 (`src/hooks/usePortfolio.js` 모듈 레벨)

기존 거래 마이그레이션 패턴을 따르는 **형태 가드** 함수 — 플래그 없이 저장값 형태를 검사하므로 멱등이고, 구형식 백업을 나중에 import해도 새로고침 시 자동 변환:

```js
function migrateCashIfNeeded() {
  const raw = localStorage.getItem('ledger_cash')
  if (raw == null) return
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'number') return // 이미 신형식
    let currency = 'USD'
    try { currency = JSON.parse(localStorage.getItem('ledger_display_currency')) || 'USD' } catch { /* 기본 USD */ }
    localStorage.setItem('ledger_cash', JSON.stringify({ amount: parsed, currency }))
  } catch { /* 손상값 무시 */ }
}
migrateCashIfNeeded()
```

숫자를 **저장된 표시 통화**로 해석 — 사용자가 지금 화면에서 보던 의미 그대로.

### 3. usePortfolio

```js
const [cash, setCash] = useLocalStorage('ledger_cash', { amount: 0, currency: 'USD' })
// 읽기 시점 인라인 가드 (이중 안전망 — 테스트의 숫자 시드, 마이그레이션 직전 상태 대응)
const cashRaw = typeof cash === 'number'
  ? { amount: cash, currency: displayCurrency }
  : { amount: Number(cash?.amount) || 0, currency: cash?.currency || 'USD' }
const cashDisplay = toDisplay(cashRaw.amount, cashRaw.currency)
const totalVal = holdingsVal + cashDisplay
```

반환 객체:
- `cash: cashDisplay` — **표시 통화 숫자 (기존 의미 유지 → 소비 컴포넌트 무수정)**
- `cashRaw` — 신규 (수정 모달용)
- `setCash` — 이제 `{ amount, currency }`를 받음 (호출처는 EditModal 경유 한 곳)

### 4. EditModal (cashMode)

- 현금 잔액 입력 아래(같은 modal-field 내)에 KRW/USD 토글 추가 — 기존 `.currency-toggle`/`.currency-btn` 클래스 재사용
- 신규 prop `cashCurrency` (기본 `'USD'`), 내부 상태 `cashCur` 초기값 = prop
- `handleSave`: `patch.cashAmount` 유지 + `patch.cashCurrency = cashCur` 추가

### 5. 연결

- `HoldingsTable`: 신규 prop `cashRaw` 수신 → cashMode EditModal에 `cashAmount={cashRaw.amount} cashCurrency={cashRaw.currency}` 전달, `onSave`에서 `onSetCash({ amount: patch.cashAmount, currency: patch.cashCurrency })`. 표시용 `cash` prop은 기존대로 (이미 표시 통화 숫자)
- `DashboardPage`: `cashRaw={portfolio.cashRaw}` 1줄 추가
- Charts/RebalancingGuide/HoldingsMobileList/HoldingsDesktopTable: **무수정** (표시 통화 숫자 `cash` 소비 유지)

### 6. 테스트 (TDD — 새 동작 테스트 먼저)

`usePortfolio.test.js`:
- 기존 현금 테스트 3개를 새 인터페이스로 갱신 (의도된 변경): `setCash({ amount: 50, currency: 'USD' })` 형태, totalVal 검증
- 신규 추가:
  1. **통화 보존**: KRW 현금 + 환율 존재 + USD 표시 → `cash`(display)가 환산값, totalVal 일치
  2. **구형식 정규화**: `ledger_cash`에 숫자 시드 → cashRaw가 객체로 정규화
  3. **전환 안정성**: KRW 현금 입력 후 toggleCurrency → 현금의 실질 가치 불변 (KRW 환산값 ↔ USD 환산값이 환율 관계)

환율 제어: `ledger_exchange_rate`를 localStorage에 시드 (`{ rate: 1320, updatedAt: ... }`) — useExchangeRate가 덮어쓰기 전 초기값으로 동작 (기존 테스트 패턴 확인 후 필요시 useExchangeRate mock).

특성화 테스트(usePortfolioSnapshots)는 인라인 가드 덕에 무수정 통과 (숫자 시드 `'100'` → rate 없음 → displayCurrency 'USD' → toDisplay 항등 → totalVal 100).

## 검증 기준

1. 신규 테스트 3개 + 갱신 3개 통과, 그 외 219개 무수정 통과 (총 225)
2. `npm run build` 성공
3. 육안: 현금 수정 모달에 KRW/USD 토글, ₩ 현금 입력 후 USD 전환 시 환산값 표시 (혼동 재현 불가)

## 비범위 (YAGNI)

- 현금 다중 통화(USD+KRW 동시 보유) 없음 — 단일 항목 유지
- 거래 이력에 현금 입출금 기록 없음 (현행 직접 수정 방식 유지)
- 스냅샷 과거 데이터 보정 없음 (이미 표시 통화 기준으로 기록되어 있음)
