# 모바일 디자인 수정 + 뉴스 필터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 결함 4건(addbar 오버플로·date 잘림·거래이력 카드 배치·토글 글리프) 수정 + 미국 뉴스 SeekingAlpha 제외.

**Architecture:** CSS는 전부 `src/styles/mobile.css`(마지막 import — 데스크톱 규칙을 순서로 이김). JSX는 HoldingsMobileList(셰브론)·TransactionHistory(카드 구조)만. 뉴스 필터는 Cloudflare Function 1줄 — 로컬 검증 불가, 배포 후 확인. 기존 테스트 221개 무수정 통과가 회귀 기준 (토글은 title 조회, tx 테스트는 유지되는 클래스만 참조).

**Tech Stack:** CSS, React, Cloudflare Pages Functions

**Spec:** `docs/superpowers/specs/2026-06-12-mobile-polish-design.md`

---

### Task 1: addbar 모바일 스택 + 셰브론 토글

**Files:**
- Modify: `src/styles/mobile.css`
- Modify: `src/components/HoldingsMobileList.jsx`
- Test: `src/__tests__/components/HoldingsTable.test.jsx` (**수정 금지** — 토글은 `getByTitle('펼치기')`/`getByTitle('접기')`로 조회)

- [ ] **Step 1: mobile.css — addbar 풀폭 스택**

`src/styles/mobile.css`의 `@media (max-width: 640px) { ... }` 블록(165행 부근, `body { padding... }`이 있는 블록) 안에, 기존 규칙들 다음에 추가:

```css
  .addbar .field { flex: 1 1 100%; width: 100% }
  .addbar .field input, .addbar .field select { width: 100% }
  .addbar .btn { width: 100% }
```

- [ ] **Step 2: mobile.css — 셰브론**

`.mobile-card-toggle:hover { ... }` 규칙 다음에 추가 (미디어쿼리 밖, 글로벌 영역):

```css
.mobile-card-toggle .chevron {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform .15s;
  margin-top: -2px;
}
.mobile-card-toggle.expanded .chevron {
  transform: rotate(225deg);
  margin-top: 2px;
}
```

- [ ] **Step 3: HoldingsMobileList.jsx — 토글 버튼 교체**

`src/components/HoldingsMobileList.jsx`에서:

```jsx
                <button
                  className="mobile-card-toggle"
                  onClick={() => toggleCard(h.t)}
                  title={expandedCards[h.t] ? t('common.collapse') : t('common.expand')}
                >
                  {expandedCards[h.t] ? '∧' : '∨'}
                </button>
```
를
```jsx
                <button
                  className={`mobile-card-toggle${expandedCards[h.t] ? ' expanded' : ''}`}
                  onClick={() => toggleCard(h.t)}
                  title={expandedCards[h.t] ? t('common.collapse') : t('common.expand')}
                >
                  <span className="chevron" />
                </button>
```
로 교체.

- [ ] **Step 4: 테스트·빌드**

Run: `npx vitest run src/__tests__/components/HoldingsTable.test.jsx` → Expected: 34 PASS (무수정)
Run: `npm test` → Expected: 221 PASS
Run: `npm run build` → Expected: 성공

- [ ] **Step 5: 커밋**

```bash
git add src/styles/mobile.css src/components/HoldingsMobileList.jsx
git commit -m "fix: 모바일 addbar 풀폭 스택 + 펼침 토글 CSS 셰브론"
```

---

### Task 2: 거래이력 모바일 카드 — 캘린더 카드 스타일

**Files:**
- Modify: `src/components/TransactionHistory.jsx` (모바일 분기만)
- Modify: `src/styles/mobile.css` (tx-card 규칙 재작성)
- Test: `src/__tests__/components/TransactionHistory.test.jsx` (**수정 금지** — `.tx-mobile-list`, `.tx-card`, `.tx-card-badge.buy/.sell`, `.edit`만 참조하며 전부 유지됨)

- [ ] **Step 1: TransactionHistory.jsx 모바일 카드 JSX 교체**

`.tx-mobile-list` 내부의 카드 블록:

```jsx
          <div className="tx-card" key={tx.id}>
            <div className="tx-card-header">
              <div>
                <span className={`tx-card-badge ${tx.type}`}>{t(`tx.${tx.type}`)}</span>
                <div className="tx-card-name">
                  <span className="tx-card-ticker">{tx.ticker}</span>
                  {tx.name && tx.name !== tx.ticker && <small>{tx.name}</small>}
                </div>
                <div className="tx-card-sub">
                  {tx.date ?? t('tx.unknownDate')} · {tx.qty.toLocaleString()} {t('tx.qty')} · {fmtCurrency(tx.price, tx.currency)}
                </div>
              </div>
              <div>
                <div className="tx-card-amount">{fmtCurrency(tx.qty * tx.price, tx.currency)}</div>
              </div>
            </div>
            <div className="tx-card-actions">
              <button className="edit" onClick={() => setEditingTx(tx)} title={t('tx.edit')}>✎</button>
            </div>
          </div>
```
를 다음으로 교체:
```jsx
          <div className="tx-card" key={tx.id}>
            <span className={`tx-card-badge ${tx.type}`}>{t(`tx.${tx.type}`)}</span>
            <div className="tx-card-info">
              <div>
                <span className="tx-card-ticker">{tx.ticker}</span>
                {tx.name && tx.name !== tx.ticker && <span className="tx-card-name">{tx.name}</span>}
              </div>
              <div className="tx-card-detail">
                {tx.date ?? t('tx.unknownDate')} · {tx.qty.toLocaleString()} {t('tx.qty')} · {fmtCurrency(tx.price, tx.currency)}
              </div>
            </div>
            <div className="tx-card-right">
              <div className="tx-card-amount">{fmtCurrency(tx.qty * tx.price, tx.currency)}</div>
              <button className="edit" onClick={() => setEditingTx(tx)} title={t('tx.edit')}>✎</button>
            </div>
          </div>
```
(데스크톱 테이블 분기, 정렬, TransactionEditModal 로직은 무변경)

- [ ] **Step 2: mobile.css tx-card 규칙 재작성**

1. 공유 박스 규칙 `.holding-card, .tx-card { ... }`에서 `.tx-card` 셀렉터 제거 → `.holding-card { ... }`만 남김.
2. 공유 규칙 `.holding-card-actions, .tx-card-actions { ... }`에서 `.tx-card-actions` 셀렉터 제거.
3. 기존 `.tx-card-header { ... }`, `.tx-card-badge { ... }`, `.tx-card-name { ... }`, `.tx-card-sub { ... }`, `.tx-card-amount { ... }` 블록을 전부 삭제하고 (buy/sell 색 두 줄은 유지), 해당 위치에 아래를 배치:

```css
.tx-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 6px;
  margin-bottom: 6px;
}

.tx-card-badge {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 2px;
}

.tx-card-badge.buy { background: rgba(63,191,143,.15); color: var(--gain) }
.tx-card-badge.sell { background: rgba(232,101,79,.15); color: var(--loss) }

.tx-card-info { flex: 1; min-width: 0 }

.tx-card-ticker {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 12px;
  color: var(--ink);
}

.tx-card-name {
  font-size: 11px;
  color: var(--ink-dim);
  margin-left: 6px;
}

.tx-card-detail {
  font-size: 11px;
  color: var(--ink-faint);
  margin-top: 3px;
}

.tx-card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.tx-card-amount {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
```

- [ ] **Step 3: 테스트·빌드**

Run: `npx vitest run src/__tests__/components/TransactionHistory.test.jsx` → Expected: 전부 PASS (무수정)
Run: `npm test` → Expected: 221 PASS
Run: `npm run build` → Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/components/TransactionHistory.jsx src/styles/mobile.css
git commit -m "feat: 거래이력 모바일 카드를 캘린더 카드 스타일로 통일"
```

---

### Task 3: 뉴스 SeekingAlpha 필터

**Files:**
- Modify: `functions/api/company-news.js`

- [ ] **Step 1: 필터 추가**

`functions/api/company-news.js`에서:

```js
    const data = await res.json()
    const result = Array.isArray(data)
      ? data.slice(0, 10).map(item => ({
```
를
```js
    const data = await res.json()
    // SeekingAlpha 기사는 로그인 장벽이 있어 제외
    const filtered = Array.isArray(data)
      ? data.filter(item => !/seeking ?alpha/i.test(item.source || ''))
      : []
    const result = filtered.slice(0, 10).map(item => ({
```
로 교체하고, 기존 `: []` (Array.isArray 삼항의 else 분기)를 map 체인에 맞게 정리 — 최종 형태:

```js
    const data = await res.json()
    // SeekingAlpha 기사는 로그인 장벽이 있어 제외
    const filtered = Array.isArray(data)
      ? data.filter(item => !/seeking ?alpha/i.test(item.source || ''))
      : []
    const result = filtered.slice(0, 10).map(item => ({
      title: item.headline,
      summary: item.summary || null,
      source: item.source,
      url: item.url,
      publishedAtUnix: item.datetime,
    }))
```

- [ ] **Step 2: 문법 확인 + 커밋**

Run: `node --check functions/api/company-news.js` → Expected: 에러 없음 (Cloudflare 환경이라 로컬 실행 검증 불가 — 배포 후 뉴스 페이지에서 확인)

```bash
git add functions/api/company-news.js
git commit -m "fix: 미국 뉴스에서 SeekingAlpha 출처 제외 (로그인 장벽)"
```

---

### Task 4: 육안 검증 (사용자 확인)

- [ ] dev 서버(localhost:5173)에서 브라우저 폭 640px 이하로:
  1. 매수 모드 — addbar 필드들이 세로 풀폭 스택, date 입력에 일(日)까지 표시
  2. 매도 모드 — 종목 select가 화면 안에 풀폭으로
  3. 거래 이력 — 캘린더 카드와 같은 가로 1행 카드 (뱃지 | 티커·이름·상세 | 금액·✎)
  4. 보유 종목 카드 — 셰브론(꺾쇠) 토글, 펼침 시 회전
  5. 데스크톱 폭 — 변화 없음
- [ ] 뉴스 필터는 push·배포 후 프로덕션 뉴스 페이지에서 SeekingAlpha 부재 확인
