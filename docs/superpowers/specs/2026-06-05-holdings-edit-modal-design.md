# Holdings Edit Modal — Design Spec

**Date:** 2026-06-05  
**Status:** Approved

## Overview

보유 종목 테이블에 수정 기능을 추가한다. 각 행의 ✎ 버튼 클릭 시 모달이 열리고, 이름·수량·매수단가를 수정할 수 있다. KRW 종목은 현재가도 수정 가능하며, USD 종목의 현재가는 Finnhub 자동 갱신이므로 수정 불가.

## 변경 파일

| 파일 | 변경 유형 |
|---|---|
| `src/components/EditModal.jsx` | 신규 |
| `src/components/HoldingsTable.jsx` | 수정 |
| `src/App.jsx` | 수정 |
| `src/__tests__/components/EditModal.test.jsx` | 신규 |
| `src/__tests__/components/HoldingsTable.test.jsx` | 수정 |

## 아키텍처 & 데이터 흐름

```
App.jsx
  ├── holdings (localStorage 원본)
  ├── effectiveHoldings (live price 반영 파생값)
  └── editHolding(i, patch)
        setHoldings(holdings.map((h, idx) => idx === i ? {...h, ...patch} : h))

HoldingsTable.jsx
  ├── props: holdings(effectiveHoldings), rawHoldings(원본), onEdit, ...기존
  ├── state: editingIndex (null | number)
  ├── ✎ 버튼 → setEditingIndex(i)
  └── <EditModal
          holding={rawHoldings[editingIndex]}
          onSave={(patch) => { onEdit(editingIndex, patch); setEditingIndex(null) }}
          onClose={() => setEditingIndex(null)}
      />

EditModal.jsx
  ├── props: holding, onSave, onClose
  ├── state: { nm, q, b, c } (holding으로 초기화)
  └── 저장 시 onSave({ nm, q, b, c }) 호출
```

**왜 rawHoldings가 필요한가:** HoldingsTable은 `effectiveHoldings`(live price 반영)를 표시용으로 받지만, 편집 폼의 초기값은 사용자가 직접 입력한 원본 값이어야 한다. USD 종목의 경우 `effectiveHoldings[i].c`는 Finnhub 실시간가이므로 편집 초기값으로 부적절하다.

## EditModal 컴포넌트

### Props

| prop | type | 설명 |
|---|---|---|
| `holding` | `{ t, nm, q, b, c, currency }` | 편집할 종목 원본 데이터 |
| `onSave` | `(patch: { nm, q, b, c }) => void` | 저장 콜백 |
| `onClose` | `() => void` | 취소/닫기 콜백 |

### 내부 상태

```js
const [form, setForm] = useState({
  nm: holding.nm ?? '',
  q:  String(holding.q),
  b:  String(holding.b),
  c:  String(holding.c),
})
```

### 편집 가능 필드

| 필드 | USD | KRW |
|---|---|---|
| 이름(nm) | ✅ | ✅ |
| 수량(q) | ✅ | ✅ |
| 매수단가(b) | ✅ | ✅ |
| 현재가(c) | ❌ (API 자동 안내) | ✅ |

### 유효성 검사

저장 시: `q > 0`, `b >= 0`, `c >= 0` 모두 충족해야 함. 실패 시 `alert()`.

### UX

- `modal-overlay` 클릭으로 닫기
- Esc 키로 닫기 (`useEffect`로 keydown 이벤트)
- `e.stopPropagation()`으로 모달 내부 클릭 시 닫힘 방지

### 스타일

- `modal-overlay`: `position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 100; display: flex; align-items: center; justify-content: center`
- `modal`: 기존 `.card` 스타일과 통일, `min-width: 280px; padding: 24px`
- 버튼: 저장은 기존 `.btn`, 취소는 텍스트 버튼

## HoldingsTable 변경

### 새 Props

| prop | type | 설명 |
|---|---|---|
| `rawHoldings` | `holding[]` | 원본 holdings (live price 미반영) |
| `onEdit` | `(i, patch) => void` | 편집 저장 콜백 |

### 행 버튼 순서

```jsx
<button className="edit" onClick={() => setEditingIndex(i)} title="수정">✎</button>
<button className="del" onClick={() => onDelete(i)} title="삭제">✕</button>
```

### 모달 렌더링

```jsx
{editingIndex !== null && (
  <EditModal
    holding={rawHoldings[editingIndex]}
    onSave={patch => { onEdit(editingIndex, patch); setEditingIndex(null) }}
    onClose={() => setEditingIndex(null)}
  />
)}
```

## App.jsx 변경

```js
function editHolding(i, patch) {
  setHoldings(holdings.map((h, idx) => idx === i ? { ...h, ...patch } : h))
}
```

HoldingsTable에 `rawHoldings={holdings}`, `onEdit={editHolding}` 추가.

## 테스트

### EditModal.test.jsx

- holding으로 폼 초기값 세팅 확인
- 수량 0 입력 시 alert, onSave 미호출 확인
- 유효한 입력 후 저장 → onSave 올바른 값으로 호출 확인
- KRW 종목: 현재가 input 활성화 확인
- USD 종목: 현재가 input 비활성화(readOnly) 확인
- overlay 클릭 → onClose 호출 확인
- Esc 키 → onClose 호출 확인

### HoldingsTable.test.jsx 추가

- ✎ 버튼 클릭 → EditModal 렌더링 확인
- EditModal onSave → onEdit 올바른 인덱스·patch로 호출 확인
- EditModal onClose → 모달 사라짐 확인

## Out of Scope

- 티커(t) 수정 — 티커는 식별자이므로 변경 불가, 삭제 후 재추가
- 통화(currency) 수정 — 변경 불가, 삭제 후 재추가
- USD 현재가(c) 수정 — Finnhub 자동 갱신
