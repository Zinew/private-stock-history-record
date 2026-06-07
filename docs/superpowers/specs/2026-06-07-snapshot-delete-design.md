# 스냅샷 포인트 개별 삭제 설계

## 개요

스냅샷 추이 차트에서 개별 포인트를 클릭해 삭제할 수 있는 기능. 실수 방지를 위해 삭제 직후 5초간 언두 토스트를 제공한다.

---

## 범위

| 파일 | 작업 |
|---|---|
| `src/hooks/usePortfolio.js` | `deleteSnap(index)` 함수 추가 |
| `src/components/Charts.jsx` | 차트 클릭 핸들러, 인라인 팝업, 언두 토스트 |
| `src/index.css` | 팝업·토스트 스타일 |

---

## UX 흐름

```
차트 포인트 클릭
      │
      ▼
인라인 팝업 표시 (포인트 근처)
  "6/7 14:30  $12,500"
  [취소]  [삭제]
      │
  [삭제] 클릭
      │
      ├─ 팝업 닫힘
      ├─ 해당 스냅샷 즉시 제거
      └─ 언두 토스트 표시 (5초)
              "스냅샷 삭제됨  [되돌리기]"
                    │
           ┌────────┴────────┐
      [되돌리기] 클릭      5초 경과
           │                  │
      원래 위치에 복원     토스트 사라짐 (확정)
```

---

## 상태 설계

### `Charts.jsx` 로컬 상태

```js
// 인라인 팝업
const [popup, setPopup] = useState(null)
// { index: number, x: number, y: number, label: string, value: string }

// 언두 토스트
const [undoState, setUndoState] = useState(null)
// { snap: object, index: number, timerId: number }
```

### `usePortfolio.js` 함수 추가

```js
function deleteSnap(index) {
  setSnaps(prev => prev.filter((_, i) => i !== index))
}
```

localStorage 갱신은 기존 `useEffect`([snaps])가 담당 — 별도 저장 로직 불필요.

---

## 차트 클릭 핸들러

Chart.js `onClick` 콜백은 `(event, elements)` 형태. `elements[0]`이 있으면 포인트가 클릭된 것.

```js
onClick: (event, elements) => {
  if (!elements.length) { setPopup(null); return }
  const el = elements[0]
  const meta = event.chart.getDatasetMeta(0)
  const point = meta.data[el.index]
  setPopup({
    index: el.index,
    x: point.x,
    y: point.y,
    label: snaps[el.index].label,
    value: fmtCurrency(data[el.index], displayCurrency),
  })
}
```

---

## 팝업 위치

차트 컨테이너 `div.chart-box`에 `position: relative` 적용.
팝업은 `position: absolute`로 클릭된 포인트 좌표 근처에 배치.

- 팝업이 오른쪽 가장자리에 걸리면 왼쪽으로 이동 (transform 조정)
- 기본: 포인트 위 12px에 중앙 정렬

```js
style={{
  left: popup.x,
  top: popup.y - 12,
  transform: 'translate(-50%, -100%)',
}}
```

---

## 삭제 + 언두 흐름

```js
function handleDelete() {
  const snap = snaps[popup.index]
  const idx = popup.index
  onDeleteSnap(idx)        // usePortfolio.deleteSnap
  setPopup(null)

  const timerId = setTimeout(() => setUndoState(null), 5000)
  setUndoState({ snap, index: idx, timerId })
}

function handleUndo() {
  clearTimeout(undoState.timerId)
  onRestoreSnap(undoState.snap, undoState.index)  // usePortfolio.restoreSnap
  setUndoState(null)
}
```

### `usePortfolio.js`에 `restoreSnap` 추가

```js
function restoreSnap(snap, index) {
  setSnaps(prev => {
    const next = [...prev]
    next.splice(index, 0, snap)
    return next
  })
}
```

---

## 언두 토스트 UI

차트 카드 하단에 절대 위치로 표시.

```jsx
{undoState && (
  <div className="snap-undo-toast">
    <span>{t('charts.snapDeleted')}</span>
    <button onClick={handleUndo}>{t('charts.undoDelete')}</button>
  </div>
)}
```

---

## i18n 키 추가

`ko.json` / `en.json`의 `charts` 네임스페이스:

| 키 | 한국어 | 영어 |
|---|---|---|
| `charts.snapDeleted` | 스냅샷 삭제됨 | Snapshot deleted |
| `charts.undoDelete` | 되돌리기 | Undo |
| `charts.deleteSnap` | 삭제 | Delete |
| `charts.cancelDelete` | 취소 | Cancel |

---

## 에러 처리

- 팝업 열린 상태에서 다른 포인트 클릭 → 새 팝업으로 교체
- 팝업 열린 상태에서 차트 빈 영역 클릭 → 팝업 닫힘
- 언두 중 새 삭제 → 기존 언두 타이머 취소, 새 언두 상태로 교체 (이전 삭제는 확정)

---

## 테스트 전략

- `usePortfolio` — `deleteSnap(index)` 유닛 테스트: 올바른 인덱스 제거, localStorage 갱신
- `usePortfolio` — `restoreSnap(snap, index)` 유닛 테스트: splice 위치 정확성
- `Charts.jsx` — 팝업/토스트 렌더링은 Chart.js 캔버스 의존으로 단위 테스트 어려움 → 수동 E2E 검증
