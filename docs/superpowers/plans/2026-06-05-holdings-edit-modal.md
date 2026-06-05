# Holdings Edit Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보유 종목 테이블 각 행에 ✎ 버튼을 추가하고, 클릭 시 모달에서 이름·수량·매수단가(+KRW 현재가)를 수정할 수 있게 한다.

**Architecture:** 별도 `EditModal.jsx` 컴포넌트가 폼 상태를 소유하고, HoldingsTable은 `editingIndex` 상태로 어떤 종목이 편집 중인지 관리한다. App.jsx의 `editHolding(i, patch)`이 localStorage holdings를 갱신한다. HoldingsTable은 live price가 반영된 `effectiveHoldings`와 별도로 원본 `rawHoldings`를 받아 모달 초기값으로 사용한다.

**Tech Stack:** React (useState, useEffect), Vitest, @testing-library/react

---

### Task 1: EditModal 컴포넌트 (TDD)

**Files:**
- Create: `src/components/EditModal.jsx`
- Create: `src/__tests__/components/EditModal.test.jsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/EditModal.test.jsx` 신규 생성:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditModal from '../../components/EditModal.jsx'

const usdHolding = { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190, currency: 'USD' }
const krwHolding = { t: '005930', nm: '삼성전자', q: 5, b: 75000, c: 82000, currency: 'KRW' }

describe('EditModal', () => {
  const onSave = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  it('holding 데이터로 폼 초기화', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    expect(screen.getByDisplayValue('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
  })

  it('유효한 입력 저장 시 onSave에 올바른 값 전달', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '20' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: 'Apple Inc.', q: 20, b: 150, c: 190 })
  })

  it('수량 0 입력 시 alert 표시, onSave 미호출', () => {
    window.alert = vi.fn()
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '0' } })
    fireEvent.click(screen.getByText('저장'))
    expect(window.alert).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('USD 종목: 현재가 input은 readOnly', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    expect(screen.getByDisplayValue('190').readOnly).toBe(true)
  })

  it('KRW 종목: 현재가 input 편집 가능, 저장 시 변경값 전달', () => {
    render(<EditModal holding={krwHolding} onSave={onSave} onClose={onClose} />)
    const curInput = screen.getByDisplayValue('82000')
    expect(curInput.readOnly).toBe(false)
    fireEvent.change(curInput, { target: { value: '85000' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith({ nm: '삼성전자', q: 5, b: 75000, c: 85000 })
  })

  it('overlay 클릭 → onClose 호출', () => {
    const { container } = render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc 키 → onClose 호출', () => {
    render(<EditModal holding={usdHolding} onSave={onSave} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run src/__tests__/components/EditModal.test.jsx
```

Expected: `Cannot find module '../../components/EditModal.jsx'` 류 오류

- [ ] **Step 3: EditModal.jsx 구현**

`src/components/EditModal.jsx` 신규 생성:

```jsx
import { useState, useEffect } from 'react'

export default function EditModal({ holding, onSave, onClose }) {
  const [form, setForm] = useState({
    nm: holding.nm ?? '',
    q:  String(holding.q),
    b:  String(holding.b),
    c:  String(holding.c),
  })

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSave() {
    const q = parseFloat(form.q)
    const b = parseFloat(form.b)
    const c = parseFloat(form.c)
    if (!(q > 0) || !(b >= 0) || !(c >= 0)) {
      alert('수량·매수가·현재가를 올바르게 입력해 주세요.')
      return
    }
    onSave({ nm: form.nm.trim(), q, b, c })
  }

  const isKRW = (holding.currency ?? 'USD') === 'KRW'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 13, letterSpacing: 1, marginBottom: 20 }}>
          {holding.t} 수정
        </h3>
        <div className="modal-field">
          <label>이름(선택)</label>
          <input value={form.nm} onChange={e => setForm(f => ({ ...f, nm: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>수량</label>
          <input type="number" step="any" value={form.q} onChange={e => setForm(f => ({ ...f, q: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>매수단가</label>
          <input type="number" step="any" value={form.b} onChange={e => setForm(f => ({ ...f, b: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>
            현재가
            {!isKRW && <span style={{ color: 'var(--ink-faint)', fontSize: 10, marginLeft: 6 }}>API 자동</span>}
          </label>
          <input
            type="number" step="any"
            value={form.c}
            readOnly={!isKRW}
            style={!isKRW ? { opacity: 0.4 } : {}}
            onChange={e => { if (isKRW) setForm(f => ({ ...f, c: e.target.value })) }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>저장</button>
          <button className="btn ghost" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
npx vitest run src/__tests__/components/EditModal.test.jsx
```

Expected: 7개 테스트 모두 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/EditModal.jsx src/__tests__/components/EditModal.test.jsx
git commit -m "feat: add EditModal component with TDD"
```

---

### Task 2: CSS 스타일 추가

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: index.css에 모달 및 ✎ 버튼 스타일 추가**

`src/index.css`의 `.del` 스타일 블록(132번째 줄 근처) 바로 위에 `.edit` 스타일 추가:

```css
.edit {
  background: none;
  border: none;
  color: var(--ink-faint);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color .15s, background .15s;
}
.edit:hover { color: var(--accent); background: rgba(127,209,174,.1) }
```

파일 맨 아래에 모달 스타일 추가:

```css
/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .55);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 24px;
  min-width: 280px;
  width: 90%;
  max-width: 360px;
}
.modal-field {
  margin-bottom: 14px;
}
.modal-field label {
  display: block;
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 4px;
}
.modal-field input {
  width: 100%;
  box-sizing: border-box;
}
.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.css
git commit -m "feat: add modal and edit button styles"
```

---

### Task 3: HoldingsTable 수정 (TDD)

**Files:**
- Modify: `src/components/HoldingsTable.jsx`
- Modify: `src/__tests__/components/HoldingsTable.test.jsx`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/__tests__/components/HoldingsTable.test.jsx`의 `defaultProps` 객체에 두 prop 추가:

```js
const defaultProps = {
  holdings: [],
  rawHoldings: [],      // 추가
  totalVal: 0,
  onAdd: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),      // 추가
  displayCurrency: 'USD',
  toDisplay: identity,
  prices: {},
  priceLoading: false,
  priceError: null,
  lastUpdatedAt: null,
  onRefresh: vi.fn(),
}
```

파일 맨 아래 `describe` 블록 안에 테스트 3개 추가:

```js
it('✎ 버튼 클릭 시 EditModal 표시', () => {
  render(<HoldingsTable {...defaultProps} holdings={mockHoldings} rawHoldings={mockHoldings} totalVal={1900} />)
  fireEvent.click(screen.getByTitle('수정'))
  expect(screen.getByText('AAPL 수정')).toBeInTheDocument()
})

it('EditModal 저장 시 onEdit 올바른 인덱스·patch로 호출', () => {
  const onEdit = vi.fn()
  render(<HoldingsTable {...defaultProps} holdings={mockHoldings} rawHoldings={mockHoldings} totalVal={1900} onEdit={onEdit} />)
  fireEvent.click(screen.getByTitle('수정'))
  fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '15' } })
  fireEvent.click(screen.getByText('저장'))
  expect(onEdit).toHaveBeenCalledWith(0, { nm: 'Apple Inc.', q: 15, b: 150, c: 190 })
})

it('EditModal 취소 시 모달 사라짐', () => {
  render(<HoldingsTable {...defaultProps} holdings={mockHoldings} rawHoldings={mockHoldings} totalVal={1900} />)
  fireEvent.click(screen.getByTitle('수정'))
  expect(screen.getByText('AAPL 수정')).toBeInTheDocument()
  fireEvent.click(screen.getByText('취소'))
  expect(screen.queryByText('AAPL 수정')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run src/__tests__/components/HoldingsTable.test.jsx
```

Expected: `✎ 버튼 클릭 시 EditModal 표시` 등 3개 FAIL (기존 8개는 PASS)

- [ ] **Step 3: HoldingsTable.jsx 수정**

파일 상단에 import 2개 추가:

```js
import { useState } from 'react'           // 이미 있음, 변경 없음
import EditModal from './EditModal.jsx'     // 추가
```

함수 시그니처에 새 props 추가 (기존 props 뒤에):

```js
export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
  rawHoldings = [], onEdit = () => {},   // 추가
}) {
```

`useState` 훅 선언부(10번째 줄 근처)에 editingIndex state 추가:

```js
const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD' })
const [tickerStatus, setTickerStatus] = useState('idle')
const [editingIndex, setEditingIndex] = useState(null)   // 추가
```

각 행의 버튼 셀 (`<td>` 마지막, 123번째 줄 근처)을 아래로 교체:

```jsx
<td>
  <button className="edit" onClick={() => setEditingIndex(i)} title="수정">✎</button>
  <button className="del" onClick={() => onDelete(i)} title="삭제">✕</button>
</td>
```

`</div>` 닫는 태그(최상위 `<div className="holdings">`) 바로 앞에 EditModal 렌더링 추가:

```jsx
      {editingIndex !== null && (
        <EditModal
          holding={rawHoldings[editingIndex]}
          onSave={patch => { onEdit(editingIndex, patch); setEditingIndex(null) }}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 재실행 — 전체 PASS 확인**

```bash
npx vitest run src/__tests__/components/HoldingsTable.test.jsx
```

Expected: 11개 전체 PASS (기존 8 + 신규 3)

- [ ] **Step 5: 커밋**

```bash
git add src/components/HoldingsTable.jsx src/__tests__/components/HoldingsTable.test.jsx
git commit -m "feat: add edit button and EditModal integration to HoldingsTable"
```

---

### Task 4: App.jsx 수정

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: editHolding 함수 추가**

`src/App.jsx`의 `delHolding` 함수(54번째 줄) 바로 아래에 추가:

```js
function editHolding(i, patch) {
  setHoldings(holdings.map((h, idx) => idx === i ? { ...h, ...patch } : h))
}
```

- [ ] **Step 2: HoldingsTable에 새 props 전달**

`<HoldingsTable ...>` 블록(93번째 줄 근처)에 두 prop 추가:

```jsx
<HoldingsTable
  holdings={effectiveHoldings}
  totalVal={totalVal}
  onAdd={addHolding}
  onDelete={delHolding}
  onEdit={editHolding}
  rawHoldings={holdings}
  displayCurrency={effectiveDisplayCurrency}
  toDisplay={toDisplay}
  prices={prices}
  priceLoading={priceLoading}
  priceError={priceError}
  lastUpdatedAt={lastUpdatedAt}
  onRefresh={refresh}
/>
```

- [ ] **Step 3: 전체 테스트 실행 — 회귀 없음 확인**

```bash
npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/App.jsx
git commit -m "feat: wire editHolding and rawHoldings to HoldingsTable"
```

---

### Task 5: 브라우저 수동 검증

- [ ] **Step 1: 개발 서버 실행** (이미 실행 중이면 생략)

```bash
npm run dev
```

- [ ] **Step 2: 기능 검증**

`http://localhost:5173` 에서 확인:

- 각 종목 행 오른쪽에 ✎ 버튼이 보인다
- ✎ 클릭 → 모달 팝업, 이름·수량·매수단가 초기값이 올바르게 채워진다
- USD 종목: 현재가 필드가 흐리게 표시되고 수정 불가 ("API 자동" 레이블)
- KRW 종목: 현재가 필드 편집 가능
- 수량 변경 후 저장 → 테이블에 변경된 수량 반영, 평가액 재계산
- overlay(어두운 배경) 클릭 → 모달 닫힘
- Esc 키 → 모달 닫힘
- 취소 버튼 → 모달 닫힘, 데이터 변경 없음
