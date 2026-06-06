# CalendarPage 수동 이벤트 입력 설계

## 개요

Alpha Vantage에 없는 종목(예: CRCL/Circle)의 실적발표일·배당금 지급일을 사용자가 직접 캘린더에 등록할 수 있는 기능.

---

## UI 구조

### CalendarPage 레이아웃

```
[ 자동 조회 이벤트 (Alpha Vantage) ]
  실적  AAPL  Apple Inc.       2026-07-30
  배당  MSFT  Microsoft Corp.  2026-08-05

[ 내가 추가한 이벤트 ]                    [ + 추가 ]
  실적  CRCL  Circle Inc.      2026-08-18  ✕
  (이벤트 없으면 안내 문구 표시)
```

- 두 섹션 사이에 섹션 헤더로 구분
- 수동 이벤트 카드에만 ✕ 삭제 버튼 표시
- 자동·수동 이벤트 각각 날짜 오름차순 정렬

### 추가 모달

`+ 추가` 버튼 클릭 시 모달 오픈. 필드:

1. **종목 선택** — `<select>` 드롭다운. `ledger_holdings`의 보유 종목만 표시. 표시 형식: `CRCL — Circle Inc.`
2. **날짜** — `<input type="date">`. 브라우저 기본 날짜 피커.
3. **이벤트 타입** — 실적발표 / 배당금 토글 버튼 (라디오 방식, 기본값: 실적발표).

액션 버튼: **저장** / **취소**

유효성 검사:
- 종목 미선택 시 저장 불가
- 날짜 미입력 시 저장 불가
- 동일 종목+날짜 중복 저장은 허용 (사용자가 의도적으로 여러 이벤트를 같은 날에 등록할 수 있음)

---

## 데이터 모델

### 저장 위치

`localStorage` 키: `ledger_manual_events`

기존 `useLocalStorage` 훅 재사용.

### 데이터 구조

```json
[
  { "ticker": "CRCL", "date": "2026-08-18", "type": "earnings" },
  { "ticker": "NVDA", "date": "2026-09-10", "type": "dividend" }
]
```

| 필드 | 타입 | 값 |
|---|---|---|
| `ticker` | string | 보유 종목 티커 (예: `"CRCL"`) |
| `date` | string | `"YYYY-MM-DD"` 형식 |
| `type` | string | `"earnings"` 또는 `"dividend"` |

---

## 컴포넌트 설계

### 새 컴포넌트

**`src/components/ManualEventModal.jsx`**
- props: `holdings`, `onSave(event)`, `onClose`
- 내부 상태: `ticker`, `date`, `type`
- 저장 시 `onSave({ ticker, date, type })` 호출 후 모달 닫힘

### 수정 컴포넌트

**`src/pages/CalendarPage.jsx`**
- `useLocalStorage('ledger_manual_events', [])` 추가
- `+ 추가` 버튼 및 모달 마운트/언마운트
- 수동 이벤트 섹션 렌더링
- 삭제: 해당 인덱스를 배열에서 제거

---

## 스타일

기존 `.calendar-badge`, `.calendar-card` CSS 클래스 재사용.
- 실적 배지: 기존 `.calendar-badge.earnings` (주황)
- 배당 배지: 기존 `.calendar-badge.dividend` (파랑)
- 수동 이벤트 카드: 자동 이벤트와 동일한 카드 스타일, ✕ 버튼만 추가

---

## 범위 외

- 크로스 디바이스 동기화 — 별도 작업으로 예정
- 메모/노트 필드 — 미포함
- 보유 종목이 아닌 임의 티커 직접 입력 — 미포함
