export const fmt = n =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const pct = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'

export const fmtKRW = n =>
  (n < 0 ? '-' : '') + '₩' + Math.abs(n).toLocaleString('ko-KR', { maximumFractionDigits: 0 })

export const fmtCurrency = (n, currency) =>
  currency === 'KRW' ? fmtKRW(n) : fmt(n)
