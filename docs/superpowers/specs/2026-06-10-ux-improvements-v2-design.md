# UX 개선 v2 설계 스펙

## 개요

세 가지 UX 개선 사항을 구현한다.
1. 리밸런싱 가이드를 보유종목 박스 외부의 독립 섹션으로 분리
2. 종목 비중 파이 차트에 현금 슬라이스 추가
3. 모바일 보유종목 카드 기본 접힘 + 이름 말줄임표

---

## 결정 사항

| 항목 | 결정 |
|------|------|
| 리밸런싱 가이드 위치 | HoldingsTable 외부, 별도 독립 섹션 |
| 파이 차트 현금 | 슬라이스 추가, cash=0 시 미표시 |
| 모바일 카드 기본 상태 | 접힘 (이름 + 평가액 + 수익률만 표시) |
| 이름 말줄임표 | 모바일 카드뷰만 적용 |
| 펼치기 버튼 | ∨ (아래 방향) |
| 접기 버튼 | ∧ (위 방향) |

---

## 아키텍처

### 신규 파일

- `src/components/RebalancingGuide.jsx` — 리밸런싱 가이드 독립 컴포넌트

### 수정 파일

- `src/components/HoldingsTable.jsx` — 리밸런싱 로직 제거, 모바일 카드 접힘 상태 추가
- `src/components/Charts.jsx` — cash prop 추가, 현금 슬라이스 렌더링
- `src/App.jsx` — RebalancingGuide 렌더링, Charts에 cash prop 전달
- `src/index.css` — 모바일 카드 접힘/펼침 스타일 추가

---

## 컴포넌트 설계

### RebalancingGuide.jsx (신규)

Props:
```js
{
  holdings,        // usePortfolio effectiveHoldings
  cash,            // number
  targetWeights,   // { [ticker]: number, cash?: number }
  totalVal,        // number (holdings val 합산 + cash)
  displayCurrency, // 'KRW' | 'USD'
  fxRate,          // number
}
```

내부:
- `computeRebalancing(allRows, targetWeights, totalVal)` 호출
- `totalTargetWeight(targetWeights)` 호출
- 목표 비중이 하나도 설정 안 된 경우 `null` 반환 (숨김)
- 기존 `.rebalancing-card` HTML/CSS 그대로 이식

HoldingsTable에서 제거할 것:
- `rebalancingRows` useMemo
- 리밸런싱 카드 JSX 블록
- `computeRebalancing`, `totalTargetWeight` import

### App.jsx 변경

- `<HoldingsTable>` 렌더링 후 `<RebalancingGuide>` 렌더링
- RebalancingGuide props: `holdings`, `cash`, `targetWeights`, `totalVal`, `displayCurrency`, `fxRate`
- Charts에 `cash={cash}` prop 전달

### Charts.jsx 변경

- `cash` prop 추가 (number, 기본값 0)
- `chartTotal = holdings 합산 + cash`
- cash > 0일 때만 labels/data에 추가:
  - label: `t('cash')`
  - data: `cash`
  - 색상: `#94a3b8` (중립 회색, 팔레트 마지막 고정)
- 도넛 차트 tooltip: 기존 포맷 유지

### HoldingsTable.jsx 변경

**접힘/펼침 상태:**
```js
const [expandedCards, setExpandedCards] = useState({})
const toggleCard = (ticker) =>
  setExpandedCards(prev => ({ ...prev, [ticker]: !prev[ticker] }))
```
기본: 모두 접힘 (`expandedCards[ticker]`가 undefined/false)

**접힌 상태 카드 레이아웃:**
```
┌──────────────────────────────────────┐
│ [종목명 truncated]  [평가액]  [수익률] │
│                                   ∨  │
└──────────────────────────────────────┘
```
- 이름: `.mobile-card-name` CSS ellipsis
- 평가액 + 수익률(▲▼ 아이콘 포함) 인라인 표시
- `∨` 버튼 클릭 → 펼침

**펼친 상태 카드:**
- 기존 전체 카드 내용 (모든 stats)
- `∧` 버튼 클릭 → 접힘

**CASH 카드:**
- 항상 펼친 상태 고정 (토글 없음)

---

## CSS 추가 (index.css)

```css
/* 모바일 카드 접힘 상태 */
.mobile-card-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mobile-card-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.mobile-card-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
  padding: 4px 8px;
  flex-shrink: 0;
}
```

---

## 테스트 범위

### RebalancingGuide.test.jsx (신규)
- 목표 비중 미설정 시 null 렌더링
- 목표 비중 설정 시 카드 렌더링
- 매수/매도 금액 표시 정확성

### HoldingsTable.test.jsx (수정)
- 리밸런싱 카드 JSX 제거 확인 (더 이상 렌더링 안 함)
- 모바일 카드: 기본 접힌 상태 (∨ 버튼 표시)
- 모바일 카드: 토글 후 펼친 상태 (∧ 버튼 표시)

### Charts.test.jsx (수정)
- cash=0: 현금 슬라이스 미포함
- cash>0: labels에 현금 포함, 색상 #94a3b8 포함

---

## 비고

- 리밸런싱 계산 로직(`rebalancing.js`)은 변경 없음
- 기존 `.rebalancing-card` CSS 클래스는 그대로 유지 (RebalancingGuide로 이식)
- 모바일 카드 접힘 상태는 페이지 새로고침 시 초기화 (localStorage 저장 불필요)
