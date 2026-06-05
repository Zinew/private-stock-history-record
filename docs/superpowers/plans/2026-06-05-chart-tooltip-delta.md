# Chart Tooltip Delta Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자산 추이 라인 차트 툴팁에 직전 스냅샷 대비 변화량(Δ)과 변화율(%)을 두 번째 줄로 추가한다.

**Architecture:** 델타 계산 로직을 순수 함수 `tooltipDeltaLines`로 `format.js`에 추출해 단위 테스트하고, `Charts.jsx`의 `tooltip.callbacks.label`에서 해당 함수를 호출한다. Chart.js는 배열 반환 시 각 요소를 별도 줄로 렌더링한다.

**Tech Stack:** React, Chart.js (react-chartjs-2), Vitest

---

### Task 1: `tooltipDeltaLines` 헬퍼 추가 (TDD)

**Files:**
- Modify: `src/utils/format.js`
- Modify: `src/__tests__/format.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/format.test.js` 맨 아래에 추가:

```js
import { describe, it, expect } from 'vitest'
import { fmt, pct, fmtKRW, fmtCurrency, tooltipDeltaLines } from '../utils/format.js'

// ... 기존 테스트 유지 ...

describe('tooltipDeltaLines', () => {
  it('첫 포인트(prev 없음)는 현재값 문자열 하나만 반환', () => {
    expect(tooltipDeltaLines(12500, undefined, 'USD')).toBe(' $12,500.00')
  })
  it('상승 시 ▲ + 접두사와 변화량·변화율 포함 배열 반환', () => {
    const result = tooltipDeltaLines(12500, 12000, 'USD')
    expect(result).toEqual([' $12,500.00', ' ▲ +$500.00 (+4.2%)'])
  })
  it('하락 시 ▼ 접두사와 변화량·변화율 포함 배열 반환', () => {
    const result = tooltipDeltaLines(11800, 12000, 'USD')
    expect(result).toEqual([' $11,800.00', ' ▼ -$200.00 (-1.7%)'])
  })
  it('KRW 통화도 올바르게 포맷', () => {
    const result = tooltipDeltaLines(15000000, 14000000, 'KRW')
    expect(result).toEqual([' ₩15,000,000', ' ▲ +₩1,000,000 (+7.1%)'])
  })
  it('변화 없음(delta=0)은 ▲ + 처리', () => {
    const result = tooltipDeltaLines(12000, 12000, 'USD')
    expect(result).toEqual([' $12,000.00', ' ▲ +$0.00 (+0.0%)'])
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run src/__tests__/format.test.js
```

Expected: `tooltipDeltaLines is not a function` 류 오류

- [ ] **Step 3: `tooltipDeltaLines` 구현**

`src/utils/format.js` 맨 아래에 추가:

```js
export const tooltipDeltaLines = (cur, prev, displayCurrency) => {
  const line = ' ' + fmtCurrency(cur, displayCurrency)
  if (prev == null) return line
  const delta = cur - prev
  const pct = ((delta / prev) * 100).toFixed(1)
  const sign = delta >= 0 ? '▲ +' : '▼ '
  const deltaStr = delta >= 0
    ? fmtCurrency(delta, displayCurrency)
    : '-' + fmtCurrency(Math.abs(delta), displayCurrency)
  return [line, ` ${sign}${deltaStr} (${delta >= 0 ? '+' : ''}${pct}%)`]
}
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
npx vitest run src/__tests__/format.test.js
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/format.js src/__tests__/format.test.js
git commit -m "feat: add tooltipDeltaLines helper to format utils"
```

---

### Task 2: `Charts.jsx` 툴팁 콜백 업데이트

**Files:**
- Modify: `src/components/Charts.jsx`

- [ ] **Step 1: import에 `tooltipDeltaLines` 추가**

`Charts.jsx` 1번째 줄 import 수정:

```js
import { fmtCurrency, tooltipDeltaLines } from '../utils/format.js'
```

- [ ] **Step 2: tooltip 콜백 교체**

`lineOptions.plugins.tooltip.callbacks.label` (현재 43번째 줄 근처)를 아래로 교체:

```js
tooltip: {
  callbacks: {
    label: c => tooltipDeltaLines(c.parsed.y, data[c.dataIndex - 1], displayCurrency),
  },
},
```

- [ ] **Step 3: 전체 테스트 실행 — 기존 테스트 회귀 없음 확인**

```bash
npx vitest run
```

Expected: 전체 PASS (새 테스트 포함)

- [ ] **Step 4: 커밋**

```bash
git add src/components/Charts.jsx
git commit -m "feat: show delta and pct change in chart tooltip"
```

---

### Task 3: 브라우저 수동 검증

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 2: 스냅샷이 2개 이상 있는 상태에서 차트 포인트 호버**

확인 사항:
- 첫 번째 포인트: 값 한 줄만 표시
- 두 번째 이후 포인트: 값 + 등락 두 줄 표시
- 상승 포인트: `▲ +$XXX (+X.X%)`
- 하락 포인트: `▼ -$XXX (-X.X%)`
- KRW 토글 시 `₩` 단위로 올바르게 표시
