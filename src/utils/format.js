export const fmt = n =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const pct = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'

export const fmtKRW = n =>
  (n < 0 ? '-' : '') + '₩' + Math.abs(n).toLocaleString('ko-KR', { maximumFractionDigits: 0 })

export const fmtCurrency = (n, currency) =>
  currency === 'KRW' ? fmtKRW(n) : fmt(n)

export const tooltipDeltaLines = (cur, prev, displayCurrency) => {
  const line = ' ' + fmtCurrency(cur, displayCurrency)
  if (prev == null) return line
  const delta = cur - prev
  const deltaPct = prev === 0 ? null : ((delta / prev) * 100).toFixed(1)
  const sign = delta >= 0 ? '▲ +' : '▼ '
  const deltaStr = delta >= 0
    ? fmtCurrency(delta, displayCurrency)
    : '-' + fmtCurrency(Math.abs(delta), displayCurrency)
  const pctPart = deltaPct == null ? '' : ` (${delta >= 0 ? '+' : ''}${deltaPct}%)`
  return [line, ` ${sign}${deltaStr}${pctPart}`]
}
