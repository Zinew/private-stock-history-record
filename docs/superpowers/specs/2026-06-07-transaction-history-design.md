# 거래 이력 기반 전환 설계

## 개요

현재 "현재 보유 상태" 스냅샷 방식에서 **거래 이력 이벤트 로그** 방식으로 전환한다. 모든 현재 보유 종목, 평균단가, 실현손익은 거래 이력에서 자동 계산된다. JSON Export/Import로 데이터 백업도 추가한다.

---

## 범위

| 파일 | 작업 |
|---|---|
| `src/hooks/usePortfolio.js` | 트랜잭션 기반으로 전면 재작성, 마이그레이션 로직 추가 |
| `src/components/AddHoldingForm.jsx` | 날짜 피커 + 매수/매도 토글 추가 |
| `src/components/TransactionHistory.jsx` | 신규 — 거래 이력 테이블 |
| `src/components/BackupBar.jsx` | 신규 — Export/Import 버튼 |
| `src/components/Header.jsx` | 실현손익 항목 추가 |
| `src/pages/DashboardPage.jsx` | TransactionHistory, BackupBar 추가 |
| `src/locales/ko.json` / `en.json` | 신규 i18n 키 추가 |
| `src/index.css` | 신규 컴포넌트 스타일 추가 |

---

## 1. 데이터 구조

### 트랜잭션 스키마

```js
// localStorage 키: ledger_transactions
[
  {
    id: string,          // crypto.randomUUID()
    type: 'buy' | 'sell',
    ticker: string,      // 'AAPL', '005930'
    name: string,        // 'Apple Inc', '삼성전자'
    currency: 'USD' | 'KRW',
    date: string | null, // 'YYYY-MM-DD'. 마이그레이션된 항목은 null
    qty: number,         // 주 수량 (양수)
    price: number,       // 주당 단가
  }
]
```

### 기존 데이터 마이그레이션

`usePortfolio` 초기화 시 `ledger_transactions` 키가 없고 기존 `holdings`가 있으면 자동 변환:

```js
function migrateHoldingsToTransactions(holdings) {
  return holdings.map(h => ({
    id: crypto.randomUUID(),
    type: 'buy',
    ticker: h.t,
    name: h.nm ?? h.t,
    currency: h.currency ?? 'USD',
    date: null,   // 날짜 미상
    qty: h.q,
    price: h.avg ?? 0,
  }))
}
```

마이그레이션 후 기존 `holdings` localStorage 키 삭제.

---

## 2. 파생 계산

### 현재 보유 종목 도출

```js
function deriveHoldings(transactions) {
  const map = {}
  const sorted = [...transactions].sort((a, b) => {
    if (!a.date) return -1
    if (!b.date) return 1
    return a.date.localeCompare(b.date)
  })
  for (const tx of sorted) {
    if (!map[tx.ticker]) {
      map[tx.ticker] = { ticker: tx.ticker, name: tx.name, currency: tx.currency, qty: 0, totalCost: 0 }
    }
    if (tx.type === 'buy') {
      map[tx.ticker].qty += tx.qty
      map[tx.ticker].totalCost += tx.qty * tx.price
    } else {
      const avg = map[tx.ticker].qty > 0 ? map[tx.ticker].totalCost / map[tx.ticker].qty : 0
      map[tx.ticker].qty -= tx.qty
      map[tx.ticker].totalCost -= avg * tx.qty
    }
  }
  return Object.values(map)
    .filter(h => h.qty > 0.0001)
    .map(h => ({ ...h, avg: h.qty > 0 ? h.totalCost / h.qty : 0 }))
}
```

### 실현손익 도출 (가중평균 방식)

```js
function deriveRealizedGains(transactions) {
  const avgCosts = {}  // ticker -> { qty, totalCost }
  const realized = []  // { id, ticker, date, qty, sellPrice, avgCost, gain, currency }

  const sorted = [...transactions].sort((a, b) => {
    if (!a.date) return -1
    if (!b.date) return 1
    return a.date.localeCompare(b.date)
  })

  for (const tx of sorted) {
    if (!avgCosts[tx.ticker]) avgCosts[tx.ticker] = { qty: 0, totalCost: 0 }
    if (tx.type === 'buy') {
      avgCosts[tx.ticker].qty += tx.qty
      avgCosts[tx.ticker].totalCost += tx.qty * tx.price
    } else {
      const avgCost = avgCosts[tx.ticker].qty > 0
        ? avgCosts[tx.ticker].totalCost / avgCosts[tx.ticker].qty
        : 0
      const gain = (tx.price - avgCost) * tx.qty
      realized.push({ id: tx.id, ticker: tx.ticker, date: tx.date, qty: tx.qty, sellPrice: tx.price, avgCost, gain, currency: tx.currency })
      avgCosts[tx.ticker].qty -= tx.qty
      avgCosts[tx.ticker].totalCost -= avgCost * tx.qty
    }
  }
  return realized
}
```

`usePortfolio` 반환 객체에 `transactions`, `addTransaction`, `deleteTransaction`, `realizedGains`, `totalRealizedGain` 추가.

---

## 3. UI 변경

### 3-1. AddHoldingForm — 매수/매도 토글 + 날짜 추가

기존 필드 유지, 아래 두 필드 추가:

- **type 토글**: `매수 | 매도` (기본값: 매수)
  - 매도 선택 시: 종목 드롭다운이 현재 보유 종목으로 제한됨
  - 매도 수량 > 현재 보유 수량이면 제출 불가 (에러 메시지)
- **date 피커**: `<input type="date">`, 기본값 오늘

기존 `addHolding(holding)` 함수 대신 `addTransaction(tx)` 호출.

### 3-2. TransactionHistory — 신규 컴포넌트

대시보드 보유 종목 테이블 하단에 배치.

```
| 날짜       | 종목   | 구분 | 수량 | 단가     | 금액      |  |
|------------|--------|------|------|----------|-----------|--|
| 2024-01-15 | AAPL   | 매수 |  10  |  $150.00 |  $1,500   | ✕ |
| 날짜 미상  | 005930 | 매수 |   5  | ₩75,000  | ₩375,000  | ✕ |
```

- 날짜 내림차순 정렬 (최신 거래 상단)
- `date: null`인 행은 "날짜 미상" 표시
- ✕ 클릭 시 확인 팝업 없이 즉시 삭제 (스냅샷 삭제처럼 언두 토스트는 추가하지 않음 — YAGNI)
- 거래 없을 시 "거래 이력이 없습니다" 표시

### 3-3. Header — 실현손익 추가

매도 거래가 1건 이상 있을 때만 표시. 기존 헤더 항목(총 평가액, 총 매입액, 평가손익, 수익률) 다음에 추가:

```
실현손익   +$1,250.00
```

양수면 초록, 음수면 빨강.

### 3-4. BackupBar — 신규 컴포넌트

SnapshotBar 옆(같은 행 또는 바로 아래)에 배치. 버튼 두 개:

- **내보내기**: 클릭 즉시 `ledger-backup-YYYY-MM-DD.json` 다운로드
  - 포함 데이터: `ledger_transactions`, `ledger_snaps`, `ledger_manual_events`, `displayCurrency`, `i18nextLng`
- **불러오기**: 파일 피커 → JSON 선택 시 확인 팝업 "현재 데이터가 모두 교체됩니다. 계속하시겠습니까?" → 확인 시 복원

---

## 4. i18n 키

`ko.json` / `en.json`의 최상위 네임스페이스:

| 키 | 한국어 | 영어 |
|---|---|---|
| `tx.buy` | 매수 | Buy |
| `tx.sell` | 매도 | Sell |
| `tx.date` | 날짜 | Date |
| `tx.qty` | 수량 | Qty |
| `tx.price` | 단가 | Price |
| `tx.amount` | 금액 | Amount |
| `tx.history` | 거래 이력 | Transaction History |
| `tx.empty` | 거래 이력이 없습니다 | No transactions yet |
| `tx.unknownDate` | 날짜 미상 | Unknown date |
| `tx.sellExceedsHolding` | 보유 수량 초과 | Exceeds held quantity |
| `header.realizedGain` | 실현손익 | Realized Gain |
| `backup.export` | 내보내기 | Export |
| `backup.import` | 불러오기 | Import |
| `backup.importConfirm` | 현재 데이터가 모두 교체됩니다. 계속하시겠습니까? | This will replace all current data. Continue? |
| `backup.importSuccess` | 데이터가 복원되었습니다 | Data restored successfully |

---

## 5. EditModal 처리

기존 EditModal은 수량·단가를 직접 수정할 수 있었다. 트랜잭션 기반에서는 수량·단가가 이력에서 계산되므로 직접 수정이 불가능하다.

**처리 방식:**
- EditModal에서 `수량`, `매수단가` 필드 제거
- `종목명(nm)` 수정만 유지 — 해당 ticker의 모든 트랜잭션에 name 일괄 적용
- 수량/단가 수정이 필요할 경우: 거래 이력에서 해당 트랜잭션 삭제 후 재입력

---

## 6. 에러 처리

- 매도 수량 > 보유 수량: 폼 제출 차단, 인라인 에러 메시지
- Import 파일이 유효하지 않은 JSON: "올바른 백업 파일이 아닙니다" 알림
- Import 파일에 `ledger_transactions` 키 없음: 동일 에러

---

## 6. 테스트 전략

- `deriveHoldings` — 매수/매도 혼합 시 수량·평균단가 정확성
- `deriveRealizedGains` — 가중평균 손익 계산 정확성
- `migrateHoldingsToTransactions` — 기존 holdings 변환 정확성
- `BackupBar` — Export 파일 내용 검증, Import 복원 후 상태 검증
- `AddHoldingForm` — 매도 수량 초과 시 제출 차단 검증
