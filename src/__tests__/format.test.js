import { describe, it, expect } from 'vitest'
import { fmt, pct, fmtKRW, fmtCurrency } from '../utils/format.js'

describe('fmt', () => {
  it('양수를 $X,XXX.XX 형식으로 변환', () => {
    expect(fmt(1234.5)).toBe('$1,234.50')
  })
  it('0을 $0.00으로 변환', () => {
    expect(fmt(0)).toBe('$0.00')
  })
  it('음수를 -$X,XXX.XX 형식으로 변환', () => {
    expect(fmt(-400)).toBe('-$400.00')
  })
})

describe('pct', () => {
  it('양수에 + 접두사 붙이기', () => {
    expect(pct(10.96)).toBe('+10.96%')
  })
  it('음수 그대로 표시', () => {
    expect(pct(-5.5)).toBe('-5.50%')
  })
  it('0은 +0.00% 표시', () => {
    expect(pct(0)).toBe('+0.00%')
  })
})

describe('fmtKRW', () => {
  it('양수를 ₩X,XXX,XXX 형식으로 변환', () => {
    expect(fmtKRW(1234567)).toBe('₩1,234,567')
  })
  it('0을 ₩0으로 변환', () => {
    expect(fmtKRW(0)).toBe('₩0')
  })
  it('음수를 -₩X,XXX 형식으로 변환', () => {
    expect(fmtKRW(-50000)).toBe('-₩50,000')
  })
  it('소수점은 반올림해서 정수로 표시', () => {
    expect(fmtKRW(1234.7)).toBe('₩1,235')
  })
})

describe('fmtCurrency', () => {
  it('USD는 fmt로 위임', () => {
    expect(fmtCurrency(100, 'USD')).toBe('$100.00')
  })
  it('KRW는 fmtKRW로 위임', () => {
    expect(fmtCurrency(100000, 'KRW')).toBe('₩100,000')
  })
})
