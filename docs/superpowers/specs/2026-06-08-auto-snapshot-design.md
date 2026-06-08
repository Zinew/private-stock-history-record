# 자산 추이 자동화 설계 문서

**작성일: 2026-06-08**

## 목표

현재 수동 클릭이 필요한 스냅샷 기록을 자동화한다. 하루 1개 스냅샷을 유지하며, 세 가지 트리거(앱 로드, 가격 새로고침, 거래 입력)에서 오늘 값을 자동으로 기록하거나 업데이트한다.

## 현재 상태

- `snaps`: `{ label: "6/8 14:30", total: 12345, currency: "USD" }` 배열, localStorage 저장
- `takeSnapshot()`: 현재 시각 기준 label 생성 후 스냅샷 추가 (수동 버튼)
- `SnapshotBar.jsx`: "📸 오늘 자산 기록하기" + "추이 초기화" 버튼 컴포넌트

## 변경 사항

### 1. 데이터 구조 (`snaps`)

신규 스냅샷에 `date` 필드 추가:

```js
// 신규 (자동 생성)
{ label: "6/8", total: 12345, currency: "USD", date: "2026-06-08" }

// 기존 (유지, 건드리지 않음)
{ label: "6/8 14:30", total: 12345, currency: "USD" }
```

- `date` 필드는 `YYYY-MM-DD` 형식
- 기존 스냅샷(date 없음)은 그대로 보존

### 2. 핵심 함수: `upsertTodaySnap(total, currency)`

`usePortfolio.js` 내부에 추가:

```js
function upsertTodaySnap(total, currency) {
  if (holdings.length === 0 || !(total > 0)) return
  const today = new Date().toISOString().slice(0, 10)
  const d = new Date()
  const label = `${d.getMonth() + 1}/${d.getDate()}`
  setSnaps(prev => {
    const idx = prev.findIndex(s => s.date === today)
    if (idx >= 0) {
      const next = [...prev]
      next[idx] = { ...next[idx], total, currency }
      return next
    }
    const next = [...prev, { label, total, currency, date: today }]
    return next.length > 60 ? next.slice(-60) : next
  })
}
```

### 3. 트리거 구현

#### 트리거 A+B: 가격 로딩 완료 (앱 로드 + 새로고침 버튼)

앱 로드 시 자동 가격 fetch가 완료되면 스냅샷을 기록한다. 새로고침 버튼 클릭 후 가격 reload가 완료될 때도 동일하게 동작한다. `priceLoading`이 `true → false`로 전환되는 시점을 `useRef`로 감지:

```js
import { useMemo, useEffect, useRef } from 'react'

const prevPriceLoading = useRef(false)

useEffect(() => {
  if (prevPriceLoading.current && !priceLoading && holdings.length > 0 && totalVal > 0) {
    upsertTodaySnap(totalVal, displayCurrency)
  }
  prevPriceLoading.current = priceLoading
}, [priceLoading, totalVal, holdings.length, displayCurrency])
```

#### 트리거 C: 거래 입력 후

`addTransaction()` 호출 후 React가 re-render를 완료하면 `totalVal`이 새 거래를 반영한 값으로 업데이트된다. `useRef` flag를 사용해 다음 `totalVal` 변경 시 스냅샷을 기록:

```js
const snapAfterTx = useRef(false)

useEffect(() => {
  if (snapAfterTx.current && holdings.length > 0 && totalVal > 0) {
    upsertTodaySnap(totalVal, displayCurrency)
    snapAfterTx.current = false
  }
}, [totalVal])

function addTransaction(...) {
  // 기존 로직
  setTransactions([...transactions, tx])
  snapAfterTx.current = true
}
```

### 4. 제거

| 항목 | 처리 |
|------|------|
| `takeSnapshot()` 함수 | `usePortfolio.js`에서 삭제 |
| `takeSnapshot` return 값 | `usePortfolio.js` return 객체에서 삭제 |
| `SnapshotBar.jsx` | 파일 삭제 |
| `DashboardPage.jsx`의 SnapshotBar import/사용 | 삭제 |

`clearSnaps`, `deleteSnap`, `restoreSnap`은 유지 (Charts에서 여전히 사용).

## 파일 구조

```
수정:
  src/hooks/usePortfolio.js   — upsertTodaySnap 추가, 2개 useEffect 추가, takeSnapshot 제거
  src/pages/DashboardPage.jsx — SnapshotBar import/사용 제거

삭제:
  src/components/SnapshotBar.jsx
```

## 테스트 계획

1. 앱 로드 후 → `ledger_snaps`에 오늘 날짜 스냅샷 자동 생성 확인
2. 새로고침 버튼 클릭 후 → 오늘 스냅샷 total 값 업데이트 확인 (새 스냅샷 추가 안 됨)
3. 매수 거래 입력 후 → 오늘 스냅샷 total 값 업데이트 확인
4. 같은 날 여러 번 트리거 → 스냅샷 1개 유지 확인
5. 기존 스냅샷(date 없음) → 유지됨 확인
6. DashboardPage에서 "📸 오늘 자산 기록하기" 버튼 없어짐 확인
