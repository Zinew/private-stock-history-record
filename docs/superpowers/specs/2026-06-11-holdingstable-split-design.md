# HoldingsTable 컴포넌트 분해 설계

**날짜:** 2026-06-11
**목표:** 284줄 `HoldingsTable.jsx`를 뷰 단위 컴포넌트 3개 + 파생값 유틸로 분해한다. 외부 인터페이스(props)·동작·DOM 출력·CSS 변경 0.

## 배경

`src/components/HoldingsTable.jsx`(284줄)에 데스크톱 테이블, 모바일 카드 리스트, CASH 행/카드, EditModal 2개 호출, 헤더가 혼재한다. 중복 2건:

1. 종목별 파생값 계산(`hCur/val/cost/p/r/w` 5줄)이 데스크톱 행(97-101행)과 모바일 카드(162-167행)에서 반복
2. 빈 상태(empty state) JSX가 테이블(81-91행)과 모바일 리스트(150-160행)에 두 벌

`src/__tests__/components/HoldingsTable.test.jsx`(451줄)가 public 컴포넌트를 렌더링해 검증하므로, 인터페이스를 유지하면 테스트 무수정 통과가 회귀 기준이 된다.

## 선택한 구조

**뷰 단위 분리** (검토한 대안: 행/카드 단위까지 분해 — 파일 8개로 이 규모 앱에 과함, 모바일만 분리 — 중복 2건이 남음)

### 새 유틸: `src/utils/holdingView.js`

```js
// 보유 종목 1개의 표시용 파생값 계산 (데스크톱 행/모바일 카드 공용)
export function computeHoldingView(h, { toDisplay, totalVal }) {
  const hCur = h.currency ?? 'USD'
  const val = toDisplay(h.q * h.c, hCur)
  const cost = toDisplay(h.q * h.b, hCur)
  const p = val - cost
  const r = cost > 0 ? p / cost * 100 : 0
  const w = totalVal > 0 ? val / totalVal * 100 : 0
  return { hCur, val, cost, p, r, w }
}
```

계산식은 현재 코드와 글자 단위로 동일하다.

### `src/components/HoldingsEmptyState.jsx` (~25줄)

- props: `{ onAddFirst }`
- 현재 중복된 `.empty-state` div(아이콘/제목/설명/CTA 버튼)를 그대로 렌더
- 데스크톱에서는 호출부가 `<tr><td colSpan={10}>`로 감싸고, 모바일에서는 그대로 사용 → 최종 DOM 현재와 동일

### `src/components/HoldingsDesktopTable.jsx` (~80줄)

- props: `{ holdings, totalVal, displayCurrency, toDisplay, prices, targetWeights, cash, onEditRow, onDelete, onCashEdit, onAddFirst }`
- `.table-scroll` 테이블 전체: thead, 보유 행(live-dot 포함), CASH 행, 빈 상태
- `onEditRow(i)` = 기존 `setEditingIndex(i)`, `onDelete(i)` = 기존 `onDelete(i)`, `onCashEdit()` = 기존 `setCashEditing(true)`
- 상태 없음

### `src/components/HoldingsMobileList.jsx` (~110줄)

- props: `{ holdings, totalVal, displayCurrency, toDisplay, targetWeights, cash, onEditRow, onCashEdit, onAddFirst }`
- `.holdings-mobile-list` 전체: 접힘 카드(이름/평가액/수익률 + ∨/∧ 토글), 펼침 상세, CASH 카드, 빈 상태
- **`expandedCards` 상태 + `toggleCard`를 이 컴포넌트 내부로 이동** — 다른 곳에서 쓰지 않는 순수 UI 상태. 모바일 리스트는 CSS로만 숨겨질 뿐 언마운트되지 않으므로 상태 유지 동작 동일

### `src/components/HoldingsTable.jsx` (코디네이터, ~100줄)

남는 책임:

- 상태: `editingIndex`, `cashEditing` (모달이 데스크톱/모바일 양쪽에서 공유되므로 여기 유지)
- 헤더(제목, 새로고침 버튼, 갱신 시각), 가격 에러 배너
- `addbarRef` + `AddHoldingForm`, `onAddFirst = () => addbarRef.current?.scrollIntoView({ behavior: 'smooth' })` (ref 소유자가 정의해 양쪽 뷰에 전달)
- EditModal 2개 (종목 수정 / 현금 수정) — 현재 로직 그대로
- 헬퍼: `getOtherWeightsTotal`, `formatUpdatedAt`
- props 시그니처 변경 없음 → `DashboardPage.jsx` 무수정

### 경계 원칙

데이터는 props로 내려가고, 사용자 액션(수정/삭제/현금수정/첫종목추가)은 콜백으로 올라온다. 하위 컴포넌트 3개는 상태가 없다 (MobileList의 접힘 상태만 예외 — 지역 UI 상태).

## 검증 기준

1. `src/__tests__/components/HoldingsTable.test.jsx`(451줄) **무수정** 전부 통과 — 회귀 기준
2. 전체 `npm test` 203개 통과
3. `npm run build` 성공

## 비범위 (YAGNI)

- 동작·CSS·클래스명·DOM 구조 변경 없음 (순수 코드 이동 + 중복 제거)
- 행/카드 단위 추가 분해 없음
- 새 테스트 파일 없음 (기존 451줄 테스트가 public 인터페이스로 전부 커버)
- DashboardPage, usePortfolio 무수정
