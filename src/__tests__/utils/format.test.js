import { pctArrow, fmtArrow, pct, fmt } from '../../utils/format.js'

describe('pctArrow', () => {
  it('returns ▲ for positive values', () => {
    expect(pctArrow(12.34)).toBe('▲ 12.34%')
  })
  it('returns ▼ for negative values', () => {
    expect(pctArrow(-5.2)).toBe('▼ 5.20%')
  })
  it('falls back to pct() for zero', () => {
    expect(pctArrow(0)).toBe(pct(0))
  })
  it('falls back to pct() for NaN', () => {
    expect(pctArrow(NaN)).toBe(pct(NaN))
  })
  it('falls back to pct() for Infinity', () => {
    expect(pctArrow(Infinity)).toBe(pct(Infinity))
  })
})

describe('fmtArrow', () => {
  it('returns ▲ for positive USD', () => {
    expect(fmtArrow(1234.5, 'USD')).toBe('▲ $1,234.50')
  })
  it('returns ▼ for negative USD', () => {
    expect(fmtArrow(-50, 'USD')).toBe('▼ $50.00')
  })
  it('falls back to fmtCurrency for zero', () => {
    expect(fmtArrow(0, 'USD')).toBe(fmt(0))
  })
})
