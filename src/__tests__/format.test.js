import { describe, it, expect } from 'vitest'
import { fmt, pct, fmtKRW, fmtCurrency, tooltipDeltaLines } from '../utils/format.js'

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
  it('prev가 null일 때도 현재값만 반환', () => {
    expect(tooltipDeltaLines(12500, null, 'USD')).toBe(' $12,500.00')
  })
  it('prev가 0이면 퍼센트 없이 변화량만 표시', () => {
    const result = tooltipDeltaLines(12500, 0, 'USD')
    expect(result).toEqual([' $12,500.00', ' ▲ +$12,500.00'])
  })
})
