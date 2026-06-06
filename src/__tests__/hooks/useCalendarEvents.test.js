// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  filterUsdHoldings,
  mapToEarningsEvent,
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

describe('mapToEarningsEvent', () => {
  it('maps Alpha Vantage entry to event object with correct shape', () => {
    const holding = { t: 'AAPL', nm: 'Apple Inc.', currency: 'USD' }
    const entry = { symbol: 'AAPL', reportDate: '2026-07-30', estimate: 1.9 }
    expect(mapToEarningsEvent(holding, entry)).toEqual({
      date: '2026-07-30',
      type: 'earnings',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      epsEstimate: 1.9,
      amount: null,
    })
  })

  it('uses symbol as name when holding has no nm', () => {
    const holding = { t: 'AAPL', currency: 'USD' }
    const entry = { symbol: 'AAPL', reportDate: '2026-07-30', estimate: null }
    expect(mapToEarningsEvent(holding, entry).name).toBe('AAPL')
  })
})

describe('sortEventsByDate', () => {
  it('sorts events by date ascending', () => {
    const events = [
      { date: '2026-08-01', type: 'earnings', ticker: 'MSFT', name: 'Microsoft', epsEstimate: null, amount: null },
      { date: '2026-07-30', type: 'earnings', ticker: 'AAPL', name: 'Apple', epsEstimate: 1.9, amount: null },
    ]
    const sorted = sortEventsByDate(events)
    expect(sorted[0].date).toBe('2026-07-30')
    expect(sorted[1].date).toBe('2026-08-01')
  })

  it('filters out events without a date', () => {
    const events = [
      { date: '2026-07-30', type: 'earnings' },
      { date: null, type: 'earnings' },
    ]
    expect(sortEventsByDate(events)).toHaveLength(1)
  })
})
