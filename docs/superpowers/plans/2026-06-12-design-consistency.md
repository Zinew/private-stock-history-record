# 디자인 통일성 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) 구문 for tracking.

**Goal:** 대시보드 시각 불일치 5건 정리 — 섹션 순서, 입력 컨트롤 높이 38px 통일, 매도 버튼 레드·라벨 대칭, 리밸런싱 카드 승격, radius 통일.

**Architecture:** CSS 수정 + JSX 라벨/클래스/순서 변경만 (컴포넌트 구조 불변). 타입 토글 높이는 `.addbar` 스코프로 한정해 헤더의 통화 토글(기존 레이아웃 튜닝됨)에 영향 주지 않음. 라벨 변경에 따른 테스트 4곳 갱신은 의도된 수정.

**Tech Stack:** CSS, React (JSX), react-i18next

**Spec:** `docs/superpowers/specs/2026-06-12-design-consistency-design.md`

---

### Task 1: 섹션 순서 + 리밸런싱 카드 승격

**Files:**
- Modify: `src/pages/DashboardPage.jsx` (JSX 블록 순서)
- Modify: `src/components/RebalancingGuide.jsx` (제목 태그/클래스)
- Modify: `src/styles/rebalancing.css` (카드 스타일)
- Test: `src/__tests__/components/RebalancingGuide.test.jsx` (**수정 금지** — 텍스트 조회라 영향 없음)

- [ ] **Step 1: DashboardPage 섹션 순서 변경**

`src/pages/DashboardPage.jsx`에서 `<RebalancingGuide ... />` JSX 블록 전체(8줄)를 잘라내 `<HoldingsTable ... />` 블록 **앞**(Charts 블록 다음)으로 이동한다. props는 그대로:

```jsx
      <RebalancingGuide
        holdings={portfolio.effectiveHoldings}
        cash={portfolio.cash}
        targetWeights={portfolio.targetWeights}
        totalVal={portfolio.totalVal}
        displayCurrency={portfolio.displayCurrency}
        toDisplay={portfolio.toDisplay}
      />
```

최종 순서: Charts → RebalancingGuide → HoldingsTable → TransactionHistory → BackupBar → footer.

- [ ] **Step 2: 리밸런싱 제목을 공용 섹션 제목으로**

`src/components/RebalancingGuide.jsx`에서:

```jsx
      <h3 className="rebalancing-title">{t('holdings.rebalancingGuide')}</h3>
```
를
```jsx
      <h2 className="holdings-title">{t('holdings.rebalancingGuide')}</h2>
```
로 교체.

- [ ] **Step 3: 카드 스타일 승격**

`src/styles/rebalancing.css`에서:

1. `.rebalancing-card` 블록을 다음으로 교체:
```css
.rebalancing-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 20px;
  overflow-x: auto;
}
```
(변경: `--panel-2`→`--panel`, 12px→14px, 16px→22px, `margin-top: 12px`→`margin-bottom: 20px`)

2. `.rebalancing-title { ... }` 블록 전체를 다음으로 교체 (제목-표 간격 보정):
```css
.rebalancing-card .holdings-title {
  margin-bottom: 12px;
}
```

- [ ] **Step 4: 테스트·빌드**

Run: `npx vitest run src/__tests__/components/RebalancingGuide.test.jsx` → Expected: 6 PASS (무수정)
Run: `npm test` → Expected: 221 PASS
Run: `npm run build` → Expected: 성공

- [ ] **Step 5: 커밋**

```bash
git add src/pages/DashboardPage.jsx src/components/RebalancingGuide.jsx src/styles/rebalancing.css
git commit -m "feat: 리밸런싱 가이드를 보유 종목 위로 이동 + 섹션 카드 스타일 통일"
```

---

### Task 2: 입력 높이·버튼·radius 통일

**Files:**
- Modify: `src/styles/holdings.css` (field/select/btn)
- Modify: `src/styles/layout.css` (currency-toggle/btn)
- Modify: `src/components/AddHoldingForm.jsx` (매도 버튼)
- Modify: `src/locales/ko.json`, `src/locales/en.json` (라벨)
- Modify: `src/__tests__/components/HoldingsTable.test.jsx` (라벨 4곳 — **이번 작업에서 유일하게 허용되는 테스트 수정**)

- [ ] **Step 1: holdings.css — 입력 높이·select 폭·중복 제거·btn**

1. `.field input, .field select { ... }` 블록에 두 줄 추가 (`appearance: none;` 다음):
```css
  height: 38px;
  box-sizing: border-box;
```

2. `.field input[type="date"] { width: 130px }` 줄 **다음에** 추가:
```css
.field select { width: auto; min-width: 170px }
```

3. `.addbar select { ... }` 한 줄 규칙과 `.addbar select:focus { ... }` 한 줄 규칙 **삭제** (중복·충돌 규칙 — 이제 `.field input, .field select`가 적용됨).

4. `.btn { ... }` 블록에서 `border-radius: 8px` → `border-radius: 10px`.

5. `.btn.ghost:hover { ... }` 줄 다음에 추가:
```css
.btn.danger { background: var(--loss) }
.btn.danger:hover { background: #f08672 }
```

- [ ] **Step 2: layout.css — 토글 radius + addbar 한정 높이**

1. `.currency-toggle { ... }` 블록에서 `border-radius: 8px` → `border-radius: 10px`.

2. `.currency-btn.sell-btn.active { ... }` 줄 다음에 추가 (addbar 안의 타입 토글만 38px — 헤더 통화 토글은 불변):
```css
.addbar .currency-toggle { height: 38px }
.addbar .currency-btn { padding: 0 14px; font-size: 12px }
```

- [ ] **Step 3: AddHoldingForm 매도 버튼**

`src/components/AddHoldingForm.jsx`에서:
```jsx
              <button className="btn" onClick={handleSellSubmit}>{t('tx.sell')}</button>
```
를
```jsx
              <button className="btn danger" onClick={handleSellSubmit}>{t('tx.sellSubmit')}</button>
```
로 교체. (매수 버튼 `<button className="btn" onClick={handleBuySubmit}>{t('addHolding.addButton')}</button>`은 코드 불변 — 라벨은 로케일에서 바뀜)

- [ ] **Step 4: 로케일**

`src/locales/ko.json`:
- `addHolding` 섹션(68행 부근)의 `"addButton": "+ 추가"` → `"addButton": "+ 매수"` (**주의:** 105행 부근 캘린더 섹션의 동명 `addButton`은 건드리지 않음)
- `tx` 섹션의 `"sell": "매도"` 다음에 `"sellSubmit": "+ 매도",` 추가

`src/locales/en.json`:
- `addHolding` 섹션의 `"addButton": "+ Add"` → `"addButton": "+ Buy"` (캘린더 쪽 불변)
- `tx` 섹션에 `"sellSubmit": "+ Sell",` 추가 (ko와 같은 위치)

- [ ] **Step 5: 테스트 라벨 갱신 (4곳)**

`src/__tests__/components/HoldingsTable.test.jsx`에서 `getByText('+ 추가')` 4곳(116, 140, 221, 270행 부근)을 전부 `getByText('+ 매수')`로 교체. **다른 수정 금지.**

- [ ] **Step 6: 테스트·빌드**

Run: `npm test` → Expected: 221 PASS
Run: `npm run build` → Expected: 성공

- [ ] **Step 7: 커밋**

```bash
git add src/styles/holdings.css src/styles/layout.css src/components/AddHoldingForm.jsx src/locales/ko.json src/locales/en.json src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: addbar 컨트롤 높이 38px 통일 + 매도 버튼 레드·라벨 대칭 + radius 통일"
```

---

### Task 3: 육안 검증 (사용자 확인)

- [ ] dev 서버(localhost:5173)에서 확인 요청:
  1. addbar의 모든 컨트롤(타입 토글·날짜·검색·수량·평단·현재가·버튼)이 같은 높이(38px)로 한 줄 정렬
  2. 매도 모드 전환 — 종목 select 높이·폭 정상, 매도 버튼 레드 "+ 매도"
  3. 매수 버튼 민트 "+ 매수"
  4. 리밸런싱 가이드가 보유 종목 위에 있고 카드 배경·radius·패딩·제목이 보유 종목 섹션과 동일
  5. 헤더의 USD/KRW 토글은 기존 크기 유지
  6. 브라우저 폭 640px 이하 — 모바일 뷰 깨짐 없음
