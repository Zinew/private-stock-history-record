// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  filterUsdHoldings,
  mapEarningsToEvents,
  mapDividendsToEvents,
  sortEventsByDate,
} from '../../hooks/useCalendarEvents.js'

describe('filterUsdHoldings', () => {
  it('returns empty array when holdings is empty', () => {
    expect(filterUsdHoldings([])).toEqual([])
  })

  it('filters out KRW holdings, keeps USD', () => {
    const holdings = [
      { t: 'AAPL', nm: 'Apple', currency: 'USD' },
      { t: '005930', nm: '삼성전자', currency: 'KRW' },
    ]
    const result = filterUsdHoldings(holdings)
    expect(result).toHaveLength(1)
    expect(result[0].t).toBe('AAPL')
  })

  it('treats undefined currency as USD', () => {
    expect(filterUsdHoldings([{ t: 'TSLA', nm: 'Tesla' }])).toHaveLength(1)
  })
})

describe('mapEarningsToEvents', () => {
  it('maps earnings to event objects with correct shape', () => {
    const h = { t: 'AAPL', nm: 'Apple Inc.', currency: 'USD' }
    const earnings = [{ date: '2026-06-10', epsEstimate: 1.58 }]
    expect(mapEarningsToEvents(h, earnings)).toEqual([
      { date: '2026-06-10', type: 'earnings', ticker: 'AAPL', name: 'Apple Inc.', epsEstimate: 1.58, amount: null },
    ])
  })

  it('uses ticker as name when nm is absent', () => {
    const h = { t: 'AAPL', currency: 'USD' }
    const earnings = [{ date: '2026-06-10', epsEstimate: null }]
    expect(mapEarningsToEvents(h, earnings)[0].name).toBe('AAPL')
  })
})

describe('mapDividendsToEvents', () => {
  it('maps dividends to event objects with correct shape', () => {
    const h = { t: 'MSFT', nm: 'Microsoft', currency: 'USD' }
    const dividends = [{ exDividendDate: '2026-06-15', amount: 0.75 }]
    expect(mapDividendsToEvents(h, dividends)).toEqual([
      { date: '2026-06-15', type: 'dividend', ticker: 'MSFT', name: 'Microsoft', epsEstimate: null, amount: 0.75 },
    ])
  })
})

describe('sortEventsByDate', () => {
  it('sorts events by date ascending', () => {
    const events = [
      { date: '2026-07-01', type: 'earnings', ticker: 'AAPL', name: 'Apple', epsEstimate: null, amount: null },
      { date: '2026-06-15', type: 'dividend', ticker: 'AAPL', name: 'Apple', epsEstimate: null, amount: 0.5 },
    ]
    const sorted = sortEventsByDate(events)
    expect(sorted[0].date).toBe('2026-06-15')
    expect(sorted[1].date).toBe('2026-07-01')
  })

  it('filters out events without a date', () => {
    const events = [
      { date: '2026-06-15', type: 'dividend' },
      { date: null, type: 'earnings' },
    ]
    expect(sortEventsByDate(events)).toHaveLength(1)
  })
})
