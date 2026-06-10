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
