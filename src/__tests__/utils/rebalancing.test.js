import { describe, it, expect } from 'vitest'
import { computeRebalancing, totalTargetWeight } from '../../utils/rebalancing.js'

describe('computeRebalancing', () => {
  const rows = [
    { t: 'AAPL', nm: 'Apple', displayVal: 1000 },
    { t: 'SCHD', nm: 'SCHD', displayVal: 500 },
    { t: 'cash', nm: 'CASH', displayVal: 500 },
  ]
  const totalVal = 2000

  it('returns [] when totalVal is 0', () => {
    expect(computeRebalancing(rows, { AAPL: 50 }, 0)).toEqual([])
  })

  it('computes currentPct from displayVal / totalVal', () => {
    const result = computeRebalancing(rows, { AAPL: 40 }, totalVal)
    expect(result[0].currentPct).toBeCloseTo(50)
  })

  it('assigns sell action when target < current', () => {
    const result = computeRebalancing(rows, { AAPL: 40 }, totalVal)
    expect(result[0].action).toBe('sell')
    expect(result[0].diffPct).toBeCloseTo(-10)
  })

  it('assigns buy action when target > current', () => {
    const result = computeRebalancing(rows, { SCHD: 30 }, totalVal)
    expect(result[0].action).toBe('buy')
  })

  it('assigns hold_cash when cash target > current', () => {
    const result = computeRebalancing(rows, { cash: 30 }, totalVal)
    expect(result[0].action).toBe('hold_cash')
  })

  it('assigns use_cash when cash target < current', () => {
    const cashRows = [{ t: 'cash', nm: 'CASH', displayVal: 800 }]
    const result = computeRebalancing(cashRows, { cash: 20 }, 1000)
    expect(result[0].action).toBe('use_cash')
  })

  it('assigns hold when diffPct < 0.01', () => {
    const result = computeRebalancing(rows, { AAPL: 50 }, totalVal)
    expect(result[0].action).toBe('hold')
  })

  it('computes amount as abs(diffPct/100 * totalVal)', () => {
    const result = computeRebalancing(rows, { AAPL: 40 }, totalVal)
    expect(result[0].amount).toBeCloseTo(200)
  })

  it('excludes rows with no targetWeight entry', () => {
    const result = computeRebalancing(rows, { AAPL: 50 }, totalVal)
    expect(result).toHaveLength(1)
    expect(result[0].ticker).toBe('AAPL')
  })
})

describe('totalTargetWeight', () => {
  it('sums all weight values', () => {
    expect(totalTargetWeight({ AAPL: 40, cash: 30 })).toBe(70)
  })

  it('returns 0 for empty object', () => {
    expect(totalTargetWeight({})).toBe(0)
  })

  it('ignores null values', () => {
    expect(totalTargetWeight({ AAPL: 40, SCHD: null })).toBe(40)
  })
})
