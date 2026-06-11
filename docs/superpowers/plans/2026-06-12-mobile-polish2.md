# 모바일 2차 + US 거래소 뱃지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 카드 정보 배치 4건(펼침 상세 6셀, 현금 카드 접힘 통일, 토글 50/50, 거래이력 2줄) + US 종목 NASDAQ/NYSE 뱃지(기존 Yahoo `exchDisp` 활용).

**Architecture:** US 거래소는 KRX 전용 `exchange` 필드와 분리된 새 필드 `exchDisp`로 검색→폼→거래→보유→표시 전 구간을 흐름 (`isKRW = !!item.exchange` 판별 보존). 현금 카드 접힘은 의도된 동작 변경 — HoldingsTable.test.jsx의 현금/토글 관련 단언 갱신 필요 (토글 버튼이 2개가 되어 `getByTitle` → `getAllByTitle[0]`).

**Tech Stack:** React, CSS, Cloudflare Pages Functions, Vitest

**Spec:** `docs/superpowers/specs/2026-06-12-mobile-polish2-design.md`

---

### Task 1: 모바일 카드 정리 (펼침 상세 6셀 + 현금 카드 접힘 + 토글 50/50)

**Files:**
- Modify: `src/components/HoldingsMobileList.jsx`
- Modify: `src/styles/mobile.css`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx` (현금 카드·토글 중복 관련 단언만 — 의도된 변경)

- [ ] **Step 1: 펼침 상세에 티커·수량 셀 추가 + sub 줄 제거**

`src/components/HoldingsMobileList.jsx`의 주식 카드 펼침 블록에서, `<div className="holding-card-sub">{h.t} · {h.q.toLocaleString()} {t('holdings.qty')}</div>` 줄을 **삭제**하고, `holding-card-stats` 그리드의 첫 번째 셀 앞에 다음 2개 셀을 추가:

```jsx
                  <div>
                    <div className="holding-card-stat-label">{t('addHolding.ticker')}</div>
                    <div className="holding-card-stat-val">{h.t}</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.qty')}</div>
                    <div className="holding-card-stat-val">{h.q.toLocaleString()}</div>
                  </div>
```

(기존 4셀: 현재가/매수가/비중/목표 — 그대로 뒤에 유지. 총 6셀, 모바일 2열 그리드에서 3행 자동 배치. CSS 무변경)

- [ ] **Step 2: 현금 카드를 주식 카드 구조로 재작성**

같은 파일의 `<div className="holding-card cash-card">...</div>` 블록 전체를 다음으로 교체:

```jsx
        <div className="holding-card cash-card">
          <div className="holding-card-header">
            <div className="holding-card-name-row">
              <div className="holding-card-name">
                <span className="card-name-text">{t('holdings.cash')}</span>
              </div>
              <button
                className={`mobile-card-toggle${expandedCards.__cash__ ? ' expanded' : ''}`}
                onClick={() => toggleCard('__cash__')}
                title={expandedCards.__cash__ ? t('common.collapse') : t('common.expand')}
              >
                <span className="chevron" />
              </button>
            </div>
            <div className="holding-card-val-row">
              <div className="holding-card-val">{fmtCurrency(Number(cash) || 0, displayCurrency)}</div>
            </div>
          </div>
          {expandedCards.__cash__ && (
            <>
              <div className="holding-card-stats">
                <div>
                  <div className="holding-card-stat-label">{t('holdings.weight')}</div>
                  <div className="holding-card-stat-val">
                    {totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
                <div>
                  <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
                  <div className="holding-card-stat-val">
                    {targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}
                  </div>
                </div>
              </div>
              <div className="holding-card-actions">
                <button className="edit" onClick={onCashEdit} title={t('holdings.edit')}>✎</button>
              </div>
            </>
          )}
        </div>
```

(토글 키 `'__cash__'` — 실존 가능한 CASH 티커와 충돌 방지)

- [ ] **Step 3: mobile.css — 타입 토글 50/50**

`src/styles/mobile.css`의 640px 미디어쿼리 블록(직전 작업에서 addbar 규칙들을 넣은 곳)에 추가:

```css
  .addbar .currency-btn { flex: 1 }
```

- [ ] **Step 4: 테스트 실행 + 의도된 갱신**

Run: `npx vitest run src/__tests__/components/HoldingsTable.test.jsx`

예상 실패 유형과 갱신 방법 (이 두 유형 외 실패는 구현 버그 — 코드를 다시 봐야 함):

1. **토글 버튼 중복**: 현금 카드에도 토글이 생겨 `screen.getByTitle('펼치기')`가 "multiple elements" 에러 → `screen.getAllByTitle('펼치기')[0]`로 교체 (주식 카드가 현금 카드보다 먼저 렌더링됨). `getByTitle('접기')`도 동일하게 `getAllByTitle('접기')[0]`.
2. **현금 stats 상시 노출 가정**: 현금 카드의 비중/목표/✎가 펼치지 않고 보인다고 단언하는 테스트 → 단언 전에 현금 카드 토글 클릭 추가: `fireEvent.click(screen.getAllByTitle('펼치기').at(-1))` (현금 카드 토글은 마지막).

갱신한 테스트마다 보고서에 기록. Run: `npm test` → Expected: 222 PASS (기존 221 + Task 3에서 추가 예정 1은 아직 없음 — 이 시점은 221)

- [ ] **Step 5: 빌드 + 커밋**

Run: `npm run build` → Expected: 성공

```bash
git add src/components/HoldingsMobileList.jsx src/styles/mobile.css src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: 모바일 보유종목 상세 6셀 정리 + 현금 카드 접힘 통일 + 토글 50/50"
```

---

### Task 2: 거래이력 상세 2줄

**Files:**
- Modify: `src/components/TransactionHistory.jsx`
- Modify: `src/locales/ko.json`, `src/locales/en.json`
- Test: `src/__tests__/components/TransactionHistory.test.jsx` (**수정 금지** — 클래스 기반 조회만 사용)

- [ ] **Step 1: 로케일 키 추가**

`src/locales/ko.json`의 `tx` 섹션, `"sellSubmit": "+ 매도",` 다음에: `"sharesUnit": "주",`
`src/locales/en.json`의 `tx` 섹션, 같은 위치에: `"sharesUnit": " sh",`

- [ ] **Step 2: 상세를 2줄로**

`src/components/TransactionHistory.jsx`에서:

```jsx
              <div className="tx-card-detail">
                {tx.date ?? t('tx.unknownDate')} · {tx.qty.toLocaleString()} {t('tx.qty')} · {fmtCurrency(tx.price, tx.currency)}
              </div>
```
를
```jsx
              <div className="tx-card-detail">
                <div>{tx.date ?? t('tx.unknownDate')}</div>
                <div>{tx.qty.toLocaleString()}{t('tx.sharesUnit')} / {fmtCurrency(tx.price, tx.currency)}</div>
              </div>
```
로 교체. (CSS 무변경 — 내부 div가 자연 줄바꿈)

- [ ] **Step 3: 테스트·빌드·커밋**

Run: `npx vitest run src/__tests__/components/TransactionHistory.test.jsx` → Expected: 8 PASS (무수정)
Run: `npm test` + `npm run build`

```bash
git add src/components/TransactionHistory.jsx src/locales/ko.json src/locales/en.json
git commit -m "feat: 거래이력 모바일 상세를 날짜/수량·단가 2줄로"
```

---

### Task 3: US 거래소 뱃지 (TDD)

**Files:**
- Modify: `src/__tests__/transactions.test.js` (신규 테스트 1개 추가 — 기존 테스트 무수정)
- Modify: `src/utils/transactions.js` (deriveHoldings)
- Modify: `functions/api/usd-search.js`
- Modify: `src/hooks/useStockSearch.js`
- Modify: `src/hooks/useTransactions.js`
- Modify: `src/components/AddHoldingForm.jsx`
- Modify: `src/components/HoldingsMobileList.jsx` (market 산출 1줄)

- [ ] **Step 1: 실패하는 테스트 추가**

`src/__tests__/transactions.test.js`의 deriveHoldings describe 블록 끝에 추가:

```js
  it('buy 거래의 exchDisp가 보유 종목에 보존된다', () => {
    const holdings = deriveHoldings([
      { id: 'e1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2026-01-01', qty: 1, price: 100, exchDisp: 'NASDAQ' },
      { id: 'e2', type: 'buy', ticker: 'MSFT', name: 'Microsoft', currency: 'USD', date: '2026-01-01', qty: 1, price: 100 },
    ])
    const aapl = holdings.find(h => h.t === 'AAPL')
    const msft = holdings.find(h => h.t === 'MSFT')
    expect(aapl.exchDisp).toBe('NASDAQ')
    expect(msft).not.toHaveProperty('exchDisp')
  })
```

Run: `npx vitest run src/__tests__/transactions.test.js` → Expected: 신규 1개 FAIL (`exchDisp` undefined)

- [ ] **Step 2: deriveHoldings 보강 (기존 exchange 패턴 미러)**

`src/utils/transactions.js`의 `deriveHoldings`에서:
- map 초기화 객체에 `exchDisp: tx.exchDisp ?? null,` 추가 (exchange 다음)
- 출력 map의 `...(h.exchange ? { exchange: h.exchange } : {}),` 다음에 `...(h.exchDisp ? { exchDisp: h.exchDisp } : {}),` 추가

Run: `npx vitest run src/__tests__/transactions.test.js` → Expected: 전부 PASS

- [ ] **Step 3: 프록시 + 검색 훅**

`functions/api/usd-search.js`의 `.map(item => ({ ... }))`에 `exchDisp: item.exchDisp ?? null,` 추가.
Run: `node --check functions/api/usd-search.js` → 에러 없음.

`src/hooks/useStockSearch.js`에서 `...usdResults.map(r => ({ ...r, market: 'US' }))` → `...usdResults.map(r => ({ ...r, market: r.exchDisp || 'US' }))`.
(기존 훅 테스트의 mock 항목엔 exchDisp가 없어 'US' 폴백 → 무수정 통과)

- [ ] **Step 4: 폼 → 거래 흐름**

`src/components/AddHoldingForm.jsx`:
1. form 초기값·리셋 4곳(useState 초기값, handleNameChange, handleBuySubmit 리셋, 매도 전환 리셋)의 객체에 `exchDisp: ''` 추가
2. `handleSelect`의 setForm에 `exchDisp: item.exchDisp || '',` 추가 (exchange 다음)
3. `handleBuySubmit`의 `onAddTransaction({ ... })`에 `exchDisp: form.exchDisp || undefined,` 추가 (exchange 다음)
4. `selectedMarket` 산출의 마지막 분기 `'US'` → `(form.exchDisp || 'US')`

`src/hooks/useTransactions.js`의 `addTransaction`:
- 파라미터 구조분해에 `exchDisp` 추가
- `if (exchange) tx.exchange = exchange` 다음에 `if (exchDisp) tx.exchDisp = exchDisp` 추가

(`usePortfolio.addTransaction`은 args 통째 전달 래퍼 — 무수정)

- [ ] **Step 5: 표시**

`src/components/HoldingsMobileList.jsx`의 market 산출:
```js
const market = h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : 'US'
```
→
```js
const market = h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : (h.exchDisp || 'US')
```

- [ ] **Step 6: 전체 테스트·빌드·커밋**

Run: `npm test` → Expected: 222 PASS (221 + 신규 1)
Run: `npm run build` → Expected: 성공

```bash
git add src/__tests__/transactions.test.js src/utils/transactions.js functions/api/usd-search.js src/hooks/useStockSearch.js src/hooks/useTransactions.js src/components/AddHoldingForm.jsx src/components/HoldingsMobileList.jsx
git commit -m "feat: US 종목 거래소(NASDAQ/NYSE) 뱃지 — Yahoo exchDisp 보존"
```

---

### Task 4: 육안 검증 (사용자 확인)

- [ ] dev 서버(localhost:5173) 모바일 폭에서:
  1. 보유종목 펼침 — 티커/수량/현재가/매수가/비중/목표 6셀 그리드
  2. 현금 카드 — 주식 카드와 같은 구조(이름+토글, 금액 좌측), 접힘 기본, 펼치면 비중/목표/✎
  3. 매수/매도 토글 — 버튼 둘이 50/50 풀폭
  4. 거래이력 — 날짜 줄 + "N주 / 단가" 줄
- [ ] 거래소 뱃지는 push·배포 후: 새 US 종목 검색 → 드롭다운에 NASDAQ/NYSE, 추가 후 카드 뱃지 확인 (기존 종목은 'US' 유지)
