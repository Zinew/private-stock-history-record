# HoldingsTable 분해 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 284줄 `HoldingsTable.jsx`를 뷰 컴포넌트 3개 + 파생값 유틸로 분해한다. 외부 인터페이스·동작·DOM·CSS 변경 0.

**Architecture:** `HoldingsTable`은 상태(editingIndex/cashEditing)·헤더·모달·AddHoldingForm만 갖는 코디네이터로 축소. `HoldingsDesktopTable`/`HoldingsMobileList`는 무상태 뷰(MobileList의 접힘 상태만 지역 예외), `HoldingsEmptyState`는 중복 빈 상태 통합, `computeHoldingView`는 중복 파생값 계산 통합. 회귀 기준은 기존 `HoldingsTable.test.jsx`(451줄) **무수정** 통과.

**Tech Stack:** React, react-i18next, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-06-11-holdingstable-split-design.md`

---

### Task 1: 유틸 + 빈 상태 + 데스크톱 테이블 추출

**Files:**
- Create: `src/utils/holdingView.js`
- Create: `src/components/HoldingsEmptyState.jsx`
- Create: `src/components/HoldingsDesktopTable.jsx`
- Modify: `src/components/HoldingsTable.jsx` (데스크톱 테이블 섹션을 새 컴포넌트 호출로 교체 — 모바일 섹션은 이 Task에서 건드리지 않음)
- Test: `src/__tests__/components/HoldingsTable.test.jsx` (**수정 금지**)

- [ ] **Step 1: holdingView.js 작성**

`src/utils/holdingView.js` 생성 (계산식은 현재 HoldingsTable.jsx 96-101행과 글자 단위 동일):

```js
// 보유 종목 1개의 표시용 파생값 계산 (데스크톱 행/모바일 카드 공용)
//   hCur: 통화, val: 평가액, cost: 매수원가, p: 손익, r: 수익률%, w: 비중%
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

- [ ] **Step 2: HoldingsEmptyState.jsx 작성**

`src/components/HoldingsEmptyState.jsx` 생성 (현재 81-91행/150-160행의 중복 JSX와 동일한 DOM):

```jsx
import { useTranslation } from 'react-i18next'

// 보유 종목 없을 때의 온보딩 빈 상태 (데스크톱 테이블/모바일 리스트 공용)
export default function HoldingsEmptyState({ onAddFirst }) {
  const { t } = useTranslation()
  return (
    <div className="empty-state">
      <span className="empty-state-icon">📈</span>
      <h3 className="empty-state-title">{t('holdings.emptyTitle')}</h3>
      <p className="empty-state-desc">{t('holdings.emptyDesc')}</p>
      <button className="btn empty-state-cta" onClick={onAddFirst}>
        {t('holdings.addFirst')}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: HoldingsDesktopTable.jsx 작성**

`src/components/HoldingsDesktopTable.jsx` 생성. 현재 HoldingsTable.jsx 69-146행(`.table-scroll` 전체)의 이동이며, `setEditingIndex(i)`→`onEditRow(i)`, `setCashEditing(true)`→`onCashEdit()`, 빈 상태→`<HoldingsEmptyState>`, 파생값→`computeHoldingView`로 치환한 것:

```jsx
import { useTranslation } from 'react-i18next'
import { fmtCurrency, pctArrow, fmtArrow } from '../utils/format.js'
import { computeHoldingView } from '../utils/holdingView.js'
import HoldingsEmptyState from './HoldingsEmptyState.jsx'

// 데스크톱 보유 종목 테이블 (보유 행 + CASH 행). 상태 없음 — 액션은 콜백으로 위임
export default function HoldingsDesktopTable({
  holdings, totalVal, displayCurrency, toDisplay,
  prices, targetWeights, cash,
  onEditRow, onDelete, onCashEdit, onAddFirst,
}) {
  const { t } = useTranslation()
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t('holdings.ticker')}</th><th>{t('holdings.qty')}</th><th>{t('holdings.avgCost')}</th><th>{t('holdings.currentPrice')}</th>
            <th>{t('holdings.value')} ({dispSym})</th><th>{t('holdings.pnl')} ({dispSym})</th><th>{t('holdings.returnRate')}</th><th>{t('holdings.weight')}</th><th>{t('holdings.targetWeight')}</th><th></th>
          </tr>
        </thead>
        <tbody>
          {holdings.length === 0 ? (
            <tr>
              <td colSpan={10}>
                <HoldingsEmptyState onAddFirst={onAddFirst} />
              </td>
            </tr>
          ) : (
            holdings.map((h, i) => {
              const { hCur, val, p, r, w } = computeHoldingView(h, { toDisplay, totalVal })
              const isLive = prices[h.t] !== undefined
              return (
                <tr key={i}>
                  <td>
                    <span className="tick">
                      {h.t}
                      {h.nm && <small>{h.nm}</small>}
                    </span>
                  </td>
                  <td>{h.q.toLocaleString()}</td>
                  <td>{fmtCurrency(h.b, hCur)}</td>
                  <td>
                    {isLive && <span className="live-dot">●</span>}
                    {fmtCurrency(h.c, hCur)}
                  </td>
                  <td>{fmtCurrency(val, displayCurrency)}</td>
                  <td className={p >= 0 ? 'pos' : 'neg'}>{fmtArrow(p, displayCurrency)}</td>
                  <td className={r >= 0 ? 'pos' : 'neg'}>{pctArrow(r)}</td>
                  <td>{w.toFixed(1)}%</td>
                  <td>{targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}</td>
                  <td>
                    <button className="edit" onClick={() => onEditRow(i)} title={t('holdings.edit')}>✎</button>
                    <button className="del" onClick={() => onDelete(i)} title={t('holdings.delete')}>✕</button>
                  </td>
                </tr>
              )
            })
          )}
          <tr className="cash-row">
            <td><span className="tick">CASH<small>{t('holdings.cash')}</small></span></td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>{fmtCurrency(Number(cash) || 0, displayCurrency)}</td>
            <td>—</td>
            <td>—</td>
            <td>{totalVal > 0 ? ((Number(cash) || 0) / totalVal * 100).toFixed(1) : '0.0'}%</td>
            <td>{targetWeights['cash'] != null ? `${targetWeights['cash']}%` : '—'}</td>
            <td>
              <button className="edit" onClick={onCashEdit} title={t('holdings.edit')}>✎</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: HoldingsTable.jsx에서 데스크톱 섹션 교체**

`src/components/HoldingsTable.jsx`에서:

1. import 추가: `import HoldingsDesktopTable from './HoldingsDesktopTable.jsx'`
2. `onAddFirst` 함수를 컴포넌트 본문에 추가 (addbarRef 선언 아래):
```jsx
  const onAddFirst = () => addbarRef.current?.scrollIntoView({ behavior: 'smooth' })
```
3. 기존 `<div className="table-scroll">...</div>` 블록 전체(69-146행)를 다음으로 교체:
```jsx
      <HoldingsDesktopTable
        holdings={holdings}
        totalVal={totalVal}
        displayCurrency={displayCurrency}
        toDisplay={toDisplay}
        prices={prices}
        targetWeights={targetWeights}
        cash={cash}
        onEditRow={setEditingIndex}
        onDelete={onDelete}
        onCashEdit={() => setCashEditing(true)}
        onAddFirst={onAddFirst}
      />
```
4. 모바일 리스트의 빈 상태 버튼(기존 154-159행)의 `onClick={() => addbarRef.current?.scrollIntoView({ behavior: 'smooth' })}`은 `onClick={onAddFirst}`로 바꿔도 되고 그대로 둬도 된다 — Task 2에서 어차피 모바일 섹션 전체가 교체되므로 **그대로 둔다**.
5. `dispSym` 선언(기존 24행)은 데스크톱 테이블로 이동했으므로, HoldingsTable 안에서 다른 사용처가 없음을 확인 후 삭제한다.

- [ ] **Step 5: 테스트 확인**

Run: `npx vitest run src/__tests__/components/HoldingsTable.test.jsx`
Expected: 전부 PASS (테스트 파일 무수정). 실패 시 DOM 차이를 의심 — 새 컴포넌트의 JSX를 원본(`git show HEAD:src/components/HoldingsTable.jsx`)과 비교한다.

- [ ] **Step 6: 커밋**

```bash
git add src/utils/holdingView.js src/components/HoldingsEmptyState.jsx src/components/HoldingsDesktopTable.jsx src/components/HoldingsTable.jsx
git commit -m "refactor: HoldingsTable 데스크톱 테이블·빈 상태·파생값 계산 분리"
```

---

### Task 2: 모바일 리스트 추출 + 코디네이터 정리

**Files:**
- Create: `src/components/HoldingsMobileList.jsx`
- Modify: `src/components/HoldingsTable.jsx` (모바일 섹션 교체 + 불용 import/상태 제거)
- Test: `src/__tests__/components/HoldingsTable.test.jsx` (**수정 금지**)

- [ ] **Step 1: HoldingsMobileList.jsx 작성**

`src/components/HoldingsMobileList.jsx` 생성. 현재 HoldingsTable.jsx 148-249행(`.holdings-mobile-list` 전체)의 이동이며, `expandedCards`/`toggleCard` 상태를 내부로 옮기고 `setEditingIndex(i)`→`onEditRow(i)`, `setCashEditing(true)`→`onCashEdit()`, 빈 상태→`<HoldingsEmptyState>`, 파생값→`computeHoldingView`로 치환한 것:

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtCurrency, pctArrow } from '../utils/format.js'
import { computeHoldingView } from '../utils/holdingView.js'
import HoldingsEmptyState from './HoldingsEmptyState.jsx'

// 모바일 보유 종목 카드 리스트 (접힘/펼침 카드 + CASH 카드)
// 접힘 상태(expandedCards)는 순수 UI 상태라 이 컴포넌트에 지역화
export default function HoldingsMobileList({
  holdings, totalVal, displayCurrency, toDisplay,
  targetWeights, cash,
  onEditRow, onCashEdit, onAddFirst,
}) {
  const { t } = useTranslation()
  const [expandedCards, setExpandedCards] = useState({})
  const toggleCard = (ticker) =>
    setExpandedCards(prev => ({ ...prev, [ticker]: !prev[ticker] }))

  return (
    <div className="holdings-mobile-list">
      {holdings.length === 0 ? (
        <HoldingsEmptyState onAddFirst={onAddFirst} />
      ) : holdings.map((h, i) => {
        const { hCur, val, r, w } = computeHoldingView(h, { toDisplay, totalVal })
        const market = h.exchange === 'KS' ? 'KOSPI' : h.exchange === 'KQ' ? 'KOSDAQ' : 'US'
        return (
          <div className="holding-card" key={i}>
            <div className="holding-card-header">
              <div className="holding-card-name-row">
                <div className="holding-card-name">
                  <span className="card-name-text">{h.nm || h.t}</span>
                  <span className="market-badge">{market}</span>
                </div>
                <button
                  className="mobile-card-toggle"
                  onClick={() => toggleCard(h.t)}
                  title={expandedCards[h.t] ? t('common.collapse') : t('common.expand')}
                >
                  {expandedCards[h.t] ? '∧' : '∨'}
                </button>
              </div>
              <div className="holding-card-val-row">
                <div className="holding-card-val">{fmtCurrency(val, displayCurrency)}</div>
                <div className={`holding-card-rate ${r >= 0 ? 'pos' : 'neg'}`}>{pctArrow(r)}</div>
              </div>
            </div>
            {expandedCards[h.t] && (
              <>
                <div className="holding-card-sub">{h.t} · {h.q.toLocaleString()} {t('holdings.qty')}</div>
                <div className="holding-card-stats">
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.currentPrice')}</div>
                    <div className="holding-card-stat-val">{fmtCurrency(h.c, hCur)}</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.avgCost')}</div>
                    <div className="holding-card-stat-val">{fmtCurrency(h.b, hCur)}</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.weight')}</div>
                    <div className="holding-card-stat-val">{w.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="holding-card-stat-label">{t('holdings.targetWeight')}</div>
                    <div className="holding-card-stat-val">
                      {targetWeights[h.t] != null ? `${targetWeights[h.t]}%` : '—'}
                    </div>
                  </div>
                </div>
                <div className="holding-card-actions">
                  <button className="edit" onClick={() => onEditRow(i)} title={t('holdings.edit')}>✎</button>
                </div>
              </>
            )}
          </div>
        )
      })}
      <div className="holding-card cash-card">
        <div className="holding-card-header">
          <div>
            <div className="holding-card-name">{t('holdings.cash')}</div>
            <div className="holding-card-sub">CASH</div>
          </div>
          <div>
            <div className="holding-card-val">{fmtCurrency(Number(cash) || 0, displayCurrency)}</div>
          </div>
        </div>
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: HoldingsTable.jsx 모바일 섹션 교체 + 정리**

`src/components/HoldingsTable.jsx`에서:

1. import 추가: `import HoldingsMobileList from './HoldingsMobileList.jsx'`
2. 기존 `<div className="holdings-mobile-list">...</div>` 블록 전체를 다음으로 교체:
```jsx
      <HoldingsMobileList
        holdings={holdings}
        totalVal={totalVal}
        displayCurrency={displayCurrency}
        toDisplay={toDisplay}
        targetWeights={targetWeights}
        cash={cash}
        onEditRow={setEditingIndex}
        onCashEdit={() => setCashEditing(true)}
        onAddFirst={onAddFirst}
      />
```
3. 불용 제거: `expandedCards` 상태와 `toggleCard` 함수 삭제(MobileList로 이동됨), `fmtCurrency, pctArrow, fmtArrow` import 삭제(코디네이터에서 더는 사용 안 함 — 삭제 전 파일 내 검색으로 확인).

완료 후 HoldingsTable.jsx에 남는 것: props 시그니처(무변경), `editingIndex`/`cashEditing` 상태, `hasAutoHoldings`, `getOtherWeightsTotal`, `formatUpdatedAt`, `onAddFirst`, 헤더 JSX, 에러 배너, 두 뷰 컴포넌트 호출, addbar + AddHoldingForm, EditModal 2개 (기존 254-281행 그대로).

- [ ] **Step 3: 테스트 확인**

Run: `npx vitest run src/__tests__/components/HoldingsTable.test.jsx`
Expected: 전부 PASS (테스트 파일 무수정)

- [ ] **Step 4: 전체 테스트 + 빌드**

Run: `npm test`
Expected: 203 tests PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add src/components/HoldingsMobileList.jsx src/components/HoldingsTable.jsx
git commit -m "refactor: HoldingsTable 모바일 카드 리스트 분리 — 코디네이터로 축소 완료"
```
