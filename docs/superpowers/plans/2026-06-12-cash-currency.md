# 현금 통화 기준 고정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현금을 `{ amount, currency }`로 저장·환산해 표시 통화 전환 시 현금 가치가 둔갑하는 버그를 고친다. 입력 통화는 현금 수정 모달의 KRW/USD 토글로 지정.

**Architecture:** usePortfolio가 환산을 끝낸 표시 통화 숫자를 기존 `cash` 키로 반환 → 소비 컴포넌트 4개(Charts/RebalancingGuide/HoldingsMobileList/HoldingsDesktopTable) 무수정. 원본은 `cashRaw`로 별도 노출해 수정 모달만 사용. 구형식(숫자)은 모듈 레벨 형태 가드 마이그레이션 + 읽기 시점 인라인 가드 이중 안전망. TDD — 새 동작 테스트 먼저.

**Tech Stack:** React hooks, Vitest, localStorage

**Spec:** `docs/superpowers/specs/2026-06-12-cash-currency-design.md`

---

### Task 1: usePortfolio 현금 통화 (TDD)

**Files:**
- Modify: `src/__tests__/usePortfolio.test.js` (기존 현금 테스트 3개 갱신 — 의도된 변경 + 신규 3개 추가)
- Modify: `src/hooks/usePortfolio.js`
- Test: `src/__tests__/usePortfolioSnapshots.test.js` (**수정 금지** — 인라인 가드로 무수정 통과해야 함)

- [ ] **Step 1: 새 동작 테스트 작성 (실패 확인용)**

`src/__tests__/usePortfolio.test.js`에서:

1. 기존 현금 테스트 3개를 새 인터페이스로 **갱신**:

```js
describe('cash', () => {
  it('initializes cash to 0', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.cash).toBe(0)
    expect(result.current.cashRaw).toEqual({ amount: 0, currency: 'USD' })
  })

  it('setCash updates cash value', () => {
    const { result } = renderHook(() => usePortfolio())
    act(() => result.current.setCash({ amount: 500, currency: 'USD' }))
    expect(result.current.cash).toBe(500)
    expect(result.current.cashRaw).toEqual({ amount: 500, currency: 'USD' })
  })

  it('cash is included in totalVal', () => {
    const { result } = renderHook(() => usePortfolio())
    act(() => result.current.setCash({ amount: 300, currency: 'USD' }))
    expect(result.current.totalVal).toBe(300)
  })
})
```

(기존 테스트의 describe 구조·이름은 파일을 읽고 거기에 맞춰 적용 — 위는 단언 내용 기준)

2. 신규 describe 추가:

```js
describe('cash currency', () => {
  it('KRW 현금은 USD 표시에서 환율로 환산된다', () => {
    localStorage.setItem('ledger_exchange_rate', JSON.stringify({ rate: 1320, updatedAt: '2026-06-12' }))
    localStorage.setItem('ledger_cash', JSON.stringify({ amount: 1320000, currency: 'KRW' }))
    const { result } = renderHook(() => usePortfolio())
    // 표시 통화 기본 USD → 1,320,000 KRW = $1,000
    expect(result.current.cash).toBeCloseTo(1000)
    expect(result.current.totalVal).toBeCloseTo(1000)
  })

  it('표시 통화를 전환해도 현금의 실질 가치가 유지된다', () => {
    localStorage.setItem('ledger_exchange_rate', JSON.stringify({ rate: 1320, updatedAt: '2026-06-12' }))
    localStorage.setItem('ledger_cash', JSON.stringify({ amount: 1320000, currency: 'KRW' }))
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.cash).toBeCloseTo(1000) // USD 표시
    act(() => result.current.toggleCurrency())
    expect(result.current.cash).toBeCloseTo(1320000) // KRW 표시 — 같은 가치
  })

  it('구형식 숫자 현금은 객체로 정규화된다', () => {
    localStorage.setItem('ledger_cash', '700')
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.cashRaw).toEqual({ amount: 700, currency: 'USD' }) // rate 없음 → 표시 통화 USD
    expect(result.current.cash).toBe(700)
  })
})
```

Run: `npx vitest run src/__tests__/usePortfolio.test.js`
Expected: 갱신·신규 현금 테스트들 FAIL (`cashRaw` undefined, setCash 객체 미지원 등). 실패 메시지 기록.

- [ ] **Step 2: usePortfolio 구현**

`src/hooks/usePortfolio.js`:

1. import 블록 아래(함수 밖)에 모듈 레벨 마이그레이션 추가:

```js
// 구형식 현금(숫자) → { amount, currency } 마이그레이션.
// 형태 가드 방식 — 멱등이며, 구형식 백업 import 후 새로고침 시에도 자동 변환
function migrateCashIfNeeded() {
  const raw = localStorage.getItem('ledger_cash')
  if (raw == null) return
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'number') return
    let currency = 'USD'
    try { currency = JSON.parse(localStorage.getItem('ledger_display_currency')) || 'USD' } catch { /* 기본 USD */ }
    localStorage.setItem('ledger_cash', JSON.stringify({ amount: parsed, currency }))
  } catch { /* 손상값 무시 */ }
}

migrateCashIfNeeded()
```

2. 훅 본문에서:

```js
const [cash, setCash] = useLocalStorage('ledger_cash', { amount: 0, currency: 'USD' })
```
(기본값 0 → 객체로 변경) 그리고 기존 `totalVal` 계산부 직전에:

```js
  // 읽기 시점 인라인 가드 — 마이그레이션 전 시드·구형식 백업에도 안전
  const cashRaw = typeof cash === 'number'
    ? { amount: cash, currency: displayCurrency }
    : { amount: Number(cash?.amount) || 0, currency: cash?.currency || 'USD' }
  const cashDisplay = toDisplay(cashRaw.amount, cashRaw.currency)
```

3. `totalVal` 계산: `holdingsVal + (Number(cash) || 0)` → `holdingsVal + cashDisplay`

4. 반환 객체: `cash,` → `cash: cashDisplay,` 로 바꾸고 그 다음 줄에 `cashRaw,` 추가. `setCash` 그대로 노출.

Run: `npx vitest run src/__tests__/usePortfolio.test.js` → Expected: 전부 PASS

참고: 신규 테스트가 환율 시드(`ledger_exchange_rate`)에 의존하는데, 실제 `useExchangeRate`가 mock fetch 응답(`{}`)으로 시드를 덮어쓰면 환산 단언이 깨질 수 있다. 그 경우 테스트 파일 상단에 `vi.mock('../hooks/useExchangeRate.js', () => ({ useExchangeRate: () => {} }))`를 추가해 환율 갱신을 차단 (시드값 유지) — 프로덕션 코드 수정 금지, 조치 내역 보고.
Run: `npx vitest run src/__tests__/usePortfolioSnapshots.test.js` → Expected: 4 PASS (**무수정** — 숫자 시드 '100'이 인라인 가드로 USD 해석, rate 없어 항등 환산)

- [ ] **Step 3: 전체 테스트 + 커밋**

Run: `npm test` → Expected: 225 PASS (222 + 신규 3)

```bash
git add src/__tests__/usePortfolio.test.js src/hooks/usePortfolio.js
git commit -m "fix: 현금을 통화 정보와 함께 저장·환산 — 표시 전환 시 가치 둔갑 버그 수정 (TDD)"
```

---

### Task 2: EditModal 통화 토글 + 연결

**Files:**
- Modify: `src/components/EditModal.jsx`
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/pages/DashboardPage.jsx`
- Test: `src/__tests__/components/EditModal.test.jsx` (cashMode 테스트 있으면 patch 형태 단언 갱신 — 의도된 변경. 그 외 무수정)

- [ ] **Step 1: EditModal에 통화 토글**

`src/components/EditModal.jsx`:

1. props에 `cashCurrency = 'USD',` 추가 (cashAmount 다음)
2. 상태 추가: `const [cashCur, setCashCur] = useState(cashCurrency)` (cashAmt 선언 다음)
3. `handleSave`의 `if (cashMode) patch.cashAmount = Number(cashAmt) || 0` 를:
```js
    if (cashMode) {
      patch.cashAmount = Number(cashAmt) || 0
      patch.cashCurrency = cashCur
    }
```
4. cashMode 분기의 `modal-field` 안, input 다음에 토글 추가:
```jsx
            <div className="currency-toggle" style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <button
                type="button"
                className={`currency-btn ${cashCur === 'KRW' ? 'active' : ''}`}
                onClick={() => setCashCur('KRW')}
              >KRW</button>
              <button
                type="button"
                className={`currency-btn ${cashCur === 'USD' ? 'active' : ''}`}
                onClick={() => setCashCur('USD')}
              >USD</button>
            </div>
```

- [ ] **Step 2: HoldingsTable·DashboardPage 연결**

`src/components/HoldingsTable.jsx`:
1. props 시그니처에 `cashRaw = { amount: 0, currency: 'USD' },` 추가 (`cash = 0,` 다음)
2. cashEditing EditModal 호출부:
   - `cashAmount={Number(cash) || 0}` → `cashAmount={cashRaw.amount}`
   - 그 다음 줄에 `cashCurrency={cashRaw.currency}` 추가
   - `onSave`의 `onSetCash(patch.cashAmount)` → `onSetCash({ amount: patch.cashAmount, currency: patch.cashCurrency })`

`src/pages/DashboardPage.jsx`: HoldingsTable에 `cashRaw={portfolio.cashRaw}` prop 추가 (`cash={portfolio.cash}` 다음 줄).

- [ ] **Step 3: 테스트 확인**

Run: `npx vitest run src/__tests__/components/EditModal.test.jsx src/__tests__/components/HoldingsTable.test.jsx`
Expected: PASS. EditModal cashMode 테스트가 `patch`에 `cashAmount`만 기대하며 실패하면 `cashCurrency: 'USD'` 포함으로 갱신 (의도된 변경 — 갱신 내역 보고). HoldingsTable 실패는 구현 버그로 간주.

Run: `npm test` → Expected: 225 PASS
Run: `npm run build` → Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/components/EditModal.jsx src/components/HoldingsTable.jsx src/pages/DashboardPage.jsx src/__tests__/components/EditModal.test.jsx
git commit -m "feat: 현금 수정 모달에 KRW/USD 통화 선택 추가"
```

(EditModal.test.jsx 무수정이면 git add에서 제외)

---

### Task 3: 육안 검증 (사용자 확인)

- [ ] dev 서버에서:
  1. 현금 ✎ → 모달에 KRW/USD 토글 (기존 저장 통화가 선택됨)
  2. KRW 선택 + 1,320,000 입력 → KRW 표시에서 ₩1,320,000
  3. USD로 전환 → 현금이 환산값(약 $1,000)으로 표시 — 더 이상 $1,320,000로 둔갑하지 않음
  4. 리밸런싱 가이드·파이 차트의 현금도 환산값 기준
  5. 새로고침 후에도 유지 (저장 형식 확인)
