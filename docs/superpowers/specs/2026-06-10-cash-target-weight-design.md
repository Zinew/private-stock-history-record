# 현금 포지션 + 목표 비중 설계 스펙

## 개요

포트폴리오에 현금 포지션을 추가하고, 종목별 목표 비중 설정과 리밸런싱 가이드를 제공한다.

---

## 결정 사항

| 항목 | 결정 |
|------|------|
| 현금 입력 방식 | 잔액 직접 입력 (매수 시 자동 차감 없음) |
| 리밸런싱 가이드 | 현황 비교 + 요약 카드 (매수/매도 금액 포함) |
| 현금의 목표 비중 | 포함 — 전체 합계 100% 기준 |
| UI 위치 | HoldingsTable 확장 (목표 비중 열 + 리밸런싱 카드) |
| 목표 비중 편집 | 기존 EditModal 확장 |

---

## 데이터 모델

### 새로운 localStorage 키

```
ledger_cash           → number   현금 잔액 (표시 통화 기준)
ledger_target_weights → object   { [ticker: string]: number, cash: number }
```

예시:
```json
{ "005930.KS": 30, "AAPL": 25, "SCHD": 15, "cash": 30 }
```

### 총자산 계산 변경

- **기존:** `totalVal = Σ(holding.val)`
- **변경:** `totalVal = Σ(holding.val) + cash`
- **현금 비중:** `cashWeight = cash / totalVal * 100`

### 목표 비중 합계 규칙

- 합계 100% 초과 시 EditModal에서 경고 표시 (저장은 허용)
- 100% 미달 허용 — 리밸런싱 카드에 "X% 미설정" 표시
- 목표 비중이 하나도 설정되지 않은 경우 리밸런싱 카드 숨김

---

## 아키텍처

### 신규 파일

- `src/utils/rebalancing.js` — 리밸런싱 계산 순수 함수

### 수정 파일

- `src/hooks/usePortfolio.js` — cash, targetWeights 상태 추가
- `src/components/EditModal.jsx` — 목표 비중 필드 + 현금 잔액 필드 추가
- `src/components/HoldingsTable.jsx` — 목표(%) 열 + CASH 행 + 리밸런싱 카드
- `src/index.css` — CASH 행 스타일, 리밸런싱 카드 스타일
- `src/locales/ko.json` — 신규 i18n 키
- `src/locales/en.json` — 신규 i18n 키

---

## 컴포넌트 설계

### usePortfolio.js 추가 상태

```js
const [cash, setCash] = useLocalStorage('ledger_cash', 0)
const [targetWeights, setTargetWeightsRaw] = useLocalStorage('ledger_target_weights', {})

function setTargetWeight(ticker, pct) {
  setTargetWeightsRaw(prev => ({ ...prev, [ticker]: pct }))
}
```

`usePortfolio` 반환값에 `cash`, `setCash`, `targetWeights`, `setTargetWeight` 추가.

### HoldingsTable.jsx

**테이블 열 순서:** 종목 | 현재가 | 평가액 | 매수가 | 수익률 | 비중 | 목표(%) | 편집

**CASH 행 (테이블 마지막 고정):**
- 현재가: —
- 평가액: `cash` 값 (표시 통화 포맷)
- 매수가: —
- 수익률: —
- 비중: `cashWeight` (%)
- 목표(%): `targetWeights.cash ?? '—'`
- 편집 버튼: ✎ → CashEditModal (EditModal 내 현금 모드)

**리밸런싱 요약 카드 (테이블 하단):**
- 목표 비중이 하나도 설정되지 않은 경우 렌더링 안 함
- 각 행: 종목명 | 현재 X% → 목표 Y% | ±Z% | 액션(매수/매도/현금보유/현금사용)
- 하단: 목표 비중 합계 + 미설정 경고

**모바일 카드뷰:**
- 목표(%) 항목 카드에 추가 (현재가·매수가·비중과 같은 stats 영역)
- ✎ 버튼은 기존 위치 유지

### EditModal.jsx

**종목 편집 모드 (기존 + 추가):**
```
수량          [       ]
매수단가      [       ]
종목명        [       ]
목표 비중(%)  [       ]   현재 합계: 88% (12% 남음)
```
- 합계 초과 시 빨간 경고: "합계 105% — 100% 초과"

**현금 편집 모드 (신규):**
```
현금 잔액     [       ]   (표시 통화)
목표 비중(%)  [       ]   현재 합계: 70% (30% 남음)
```

### rebalancing.js

```js
/**
 * @param {Array} holdings   - usePortfolio의 effectiveHoldings
 * @param {number} cash      - 현금 잔액
 * @param {Object} targetWeights - { [ticker]: pct, cash: pct }
 * @param {number} totalVal  - holdings val 합산 + cash
 * @returns {Array} rows - { ticker, nm, currentPct, targetPct, diffPct, action, amount }
 */
export function computeRebalancing(holdings, cash, targetWeights, totalVal) { ... }
```

- `action` 값: `'buy'` | `'sell'` | `'hold_cash'` | `'use_cash'` | `'hold'`
- `amount`: `Math.abs(diffPct / 100 * totalVal)` (표시 통화 기준)
- 목표 비중 미설정 종목은 결과에서 제외

---

## i18n 신규 키

```json
{
  "targetWeight": "목표 비중",
  "rebalancingGuide": "리밸런싱 가이드",
  "currentPct": "현재",
  "buy": "매수",
  "sell": "매도",
  "holdCash": "현금 보유",
  "useCash": "현금 사용",
  "hold": "유지",
  "totalTarget": "목표 합계",
  "unassigned": "미설정",
  "cashBalance": "현금 잔액",
  "cash": "현금",
  "weightExceeds100": "합계 {{total}}% — 100% 초과",
  "weightRemaining": "현재 합계: {{total}}% ({{remaining}}% 남음)"
}
```

---

## 테스트 범위

### rebalancing.test.js (신규)
- 정상 케이스: diffPct, amount, action 계산
- 현금 포함 totalVal 계산
- 목표 비중 합계 초과 시 계산 정확성
- 목표 비중 미설정 종목 제외
- 현금 action: hold_cash / use_cash 분기

### usePortfolio.test.js (확장)
- cash 저장·로드
- targetWeights 저장·로드
- setTargetWeight 단일 업데이트 시 다른 종목 유지
- totalVal에 cash 포함 확인

### EditModal.test.jsx (확장)
- 목표 비중 필드 렌더링
- 합계 초과 경고 렌더링
- 현금 모드: 잔액 + 목표 비중 필드 렌더링

### HoldingsTable.test.jsx (확장)
- CASH 행 렌더링
- 목표(%) 열 렌더링
- 리밸런싱 카드: 목표 미설정 시 숨김
- 리밸런싱 카드: 매수/매도 금액 표시

---

## 비고

- 현금 잔액은 표시 통화(KRW/USD) 기준으로 저장. 통화 전환 시 환율 적용은 하지 않음 — 유저가 직접 수정.
- 리밸런싱 금액은 참고용이며 세금·수수료 미반영.
