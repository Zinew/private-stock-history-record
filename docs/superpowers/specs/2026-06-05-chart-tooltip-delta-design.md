# Chart Tooltip Delta Display — Design Spec

**Date:** 2026-06-05  
**Status:** Approved

## Overview

자산 추이 라인 차트의 툴팁에 직전 스냅샷 대비 변화량(Δ)과 변화율(%)을 추가한다.

## Scope

- 변경 파일: `src/components/Charts.jsx` 1개
- 변경 위치: `lineOptions.plugins.tooltip.callbacks.label` 콜백 함수

## Behavior

- 툴팁 호버 시 두 줄 표시:
  1. 현재 값: ` $12,500`
  2. 등락 정보: ` ▲ +$450 (+3.7%)` 또는 ` ▼ -$200 (-1.5%)`
- 첫 번째 포인트(직전 값 없음)는 현재 값 한 줄만 표시
- 상승: `▲ +` 접두사, 하락: `▼ ` 접두사
- 금액은 기존 `fmtCurrency(value, displayCurrency)` 유틸 재사용
- `displayCurrency` 토글(USD/KRW) 전환 시 자동 반영

## Implementation

`tooltip.callbacks.label`을 배열 반환형으로 확장한다. Chart.js는 배열을 반환하면 각 요소를 별도 줄로 렌더링한다.

```js
label: c => {
  const cur = c.parsed.y
  const prev = data[c.dataIndex - 1]
  const line = ' ' + fmtCurrency(cur, displayCurrency)
  if (prev == null) return line
  const delta = cur - prev
  const pct = ((delta / prev) * 100).toFixed(1)
  const sign = delta >= 0 ? '▲ +' : '▼ '
  return [line, ` ${sign}${fmtCurrency(Math.abs(delta), displayCurrency)} (${delta >= 0 ? '+' : ''}${pct}%)`]
}
```

## Out of Scope

- 차트 포인트 위/아래 상시 레이블 표시 (A안으로 확정, 향후 필요 시 검토)
- 파이 차트 툴팁 변경 없음
