# 모바일 디자인 2차 + US 거래소 뱃지 설계

**날짜:** 2026-06-12
**목표:** 모바일 보유종목·거래이력 카드의 정보 배치 4건을 다듬고, US 종목에 NASDAQ/NYSE 거래소 뱃지를 추가한다 (기존 Yahoo 검색 응답의 `exchDisp` 활용 — 추가 API 없음).

## 배경

1. 보유종목 펼침 상세에서 `{티커} · {수량} 주` 줄(`.holding-card-sub`)이 stats 그리드와 따로 놀며 애매하게 떠 있음
2. 현금 카드만 헤더 구조가 다름 (금액이 오른쪽, stats 항상 노출, 토글 없음) — 주식 카드와 불일치
3. 모바일 풀폭 스택(직전 작업) 이후 매수/매도 타입 토글 박스가 풀폭으로 늘어났는데 버튼은 내용 폭만 차지 → 매도 옆 빈공간
4. 거래이력 상세가 `날짜 · 수량 · 단가` 한 줄 나열로 정신없음
5. US 종목 거래소: Yahoo 검색 응답에 `exchDisp`("NASDAQ"/"NYSE")가 이미 오는데 프록시가 버림. **주의:** 데이터 모델에서 `exchange` 필드는 KRX 코드(KS/KQ) 전용이며 `isKRW = !!item.exchange` 판별에 쓰임 → US 거래소는 **별도 필드 `exchDisp`**로 흐르게 해야 함

## 변경 내용

### 1. 펼침 상세 — 티커·수량을 stats 셀로 (`HoldingsMobileList.jsx`)

- `.holding-card-sub` 줄 제거
- stats 그리드 맨 앞에 셀 2개 추가 (기존 셀 마크업과 동일한 구조):
  - `티커`(라벨: `t('addHolding.ticker')`) / 값: `h.t`
  - `수량`(라벨: `t('holdings.qty')`) / 값: `h.q.toLocaleString()`
- 총 6셀 — 모바일 2열 그리드(기존 미디어 규칙)에서 3행 정렬: (티커|수량)(현재가|매수가)(비중|목표)
- CSS 변경 없음 (그리드가 자동 배치)

### 2. 현금 카드 통일 — 접힘 가능 (`HoldingsMobileList.jsx`)

주식 카드와 동일한 구조로 재작성:

- 이름행: `현금` + 셰브론 토글 (market-badge 없음)
- 금액행: `fmtCurrency(cash)` — 주식 평가액과 같은 좌측 위치 (기존의 오른쪽 배치 제거)
- 펼침 시: stats(비중/목표) + actions(✎) — 기본 접힘
- 토글 키: `'__cash__'` (미국에 실존하는 CASH 티커와 충돌 방지)
- `holding-card-sub`의 "CASH" 줄은 제거 (티커 셀 개념이 없으므로 표기 불필요)
- **기존 테스트 영향:** HoldingsTable.test.jsx에 현금 카드 stats가 항상 보인다고 가정한 단언이 있으면 펼침 후 단언으로 갱신 — 의도된 동작 변경 (플랜에서 해당 테스트를 식별해 명시적으로 수정)

### 3. 타입 토글 세그먼트화 (`mobile.css`)

640px 미디어쿼리 블록에 추가:

```css
  .addbar .currency-btn { flex: 1 }
```

(토글 박스는 이미 풀폭 — 버튼 둘이 50/50로 채움. 데스크톱 무영향)

### 4. 거래이력 상세 2줄 (`TransactionHistory.jsx`, 로케일)

`.tx-card-detail`을 두 줄로:

```jsx
<div className="tx-card-detail">
  <div>{tx.date ?? t('tx.unknownDate')}</div>
  <div>{tx.qty.toLocaleString()}{t('tx.sharesUnit')} / {fmtCurrency(tx.price, tx.currency)}</div>
</div>
```

로케일 신설 `tx.sharesUnit`: ko `"주"`, en `" sh"`. CSS 변경 불필요 (`.tx-card-detail` 폰트·색 유지, 내부 div 줄바꿈).

### 5. US 거래소 뱃지 (NASDAQ/NYSE)

데이터 흐름 (검색 → 폼 → 거래 → 보유 → 표시):

1. **`functions/api/usd-search.js`**: 매핑에 `exchDisp: item.exchDisp ?? null` 추가
2. **`useStockSearch.js`**: USD 결과 매핑 `market: 'US'` → `market: r.exchDisp || 'US'` (검색 드롭다운에 NASDAQ/NYSE 표시. 기존 훅 테스트의 mock에는 exchDisp가 없어 'US' 폴백 → 무수정 통과)
3. **`AddHoldingForm.jsx`**: form 상태에 `exchDisp: ''` 추가 (모든 리셋 지점 포함). `handleSelect`에서 `exchDisp: item.exchDisp || ''` 보존. `handleBuySubmit`의 `onAddTransaction(...)`에 `exchDisp: form.exchDisp || undefined` 추가. `selectedMarket` 산출을 `form.exchange === 'KS' ? 'KOSPI' : form.exchange === 'KQ' ? 'KOSDAQ' : (form.exchDisp || 'US')`로. `isKRW = !!item.exchange` 판별 무변경
4. **`useTransactions.js`** `addTransaction`: 파라미터에 `exchDisp` 추가, `if (exchDisp) tx.exchDisp = exchDisp` (기존 exchange 패턴과 동일). `usePortfolio.addTransaction`은 args 통째 전달 래퍼라 무수정
5. **`utils/transactions.js`** `deriveHoldings`: map 초기화에 `exchDisp: tx.exchDisp ?? null`, 출력에 `...(h.exchDisp ? { exchDisp: h.exchDisp } : {})` (기존 exchange 패턴 미러)
6. **`HoldingsMobileList.jsx`** market 산출: `h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : (h.exchDisp || 'US')`
7. **TDD:** `transactions.test.js`에 deriveHoldings exchDisp 보존 테스트 1개 추가 (buy tx에 exchDisp → holding에 exchDisp; 없는 tx → 필드 부재)

기존 보유 종목은 exchDisp 데이터가 없어 'US' 폴백. 검색 경로는 Cloudflare Function이라 로컬 미동작 — 배포 후 확인.

## 검증 기준

1. `npm test` — deriveHoldings 신규 1개 추가, 현금 카드 관련 갱신분 외 무수정, 전부 통과
2. `npm run build` 성공
3. 모바일 육안: ① 펼침 상세 6셀 그리드 ② 현금 카드가 주식 카드와 동일 구조·접힘 동작 ③ 토글 50/50 ④ 거래이력 2줄 상세
4. 배포 후: 새 US 종목 검색 시 드롭다운·뱃지에 NASDAQ/NYSE 표시

## 비범위 (YAGNI)

- 정적 페이지(소개/개인정보/도움말) 재작업 — 별도 스펙으로 분리 (사용자 결정)
- 기존 보유 종목 거래소 정보 소급 없음
- 데스크톱 테이블에 거래소 열 추가 없음
