import { describe, it, expect } from 'vitest'
import {
  migrateHoldingsToTransactions,
  deriveHoldings,
  deriveRealizedGains,
} from '../utils/transactions.js'

describe('migrateHoldingsToTransactions', () => {
  it('converts each holding to a buy transaction with date: null', () => {
    const holdings = [
      { t: 'AAPL', nm: 'Apple', q: 10, b: 150, c: 180, currency: 'USD' },
      { t: '005930', nm: '삼성전자', q: 5, b: 75000, c: 82000, currency: 'KRW', exchange: 'KS' },
    ]
    const result = migrateHoldingsToTransactions(holdings)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'buy', ticker: 'AAPL', name: 'Apple',
      currency: 'USD', date: null, qty: 10, price: 150,
    })
    expect(result[0].id).toBeDefined()
    expect(result[1]).toMatchObject({
      type: 'buy', ticker: '005930', name: '삼성전자',
      currency: 'KRW', exchange: 'KS', date: null, qty: 5, price: 75000,
    })
  })
})

describe('deriveHoldings', () => {
  it('returns holding with correct qty and avg cost from single buy', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
    ]
    const result = deriveHoldings(txs)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ t: 'AAPL', nm: 'Apple', q: 10, b: 100, currency: 'USD' })
  })

  it('computes weighted average cost across multiple buys', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-02-01', qty: 10, price: 200 },
    ]
    const result = deriveHoldings(txs)
    expect(result[0].q).toBe(20)
    expect(result[0].b).toBeCloseTo(150, 5)
  })

  it('subtracts sell qty and adjusts totalCost proportionally', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-02-01', qty: 10, price: 200 },
      { id: '3', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-03-01', qty: 5, price: 250 },
    ]
    const result = deriveHoldings(txs)
    expect(result[0].q).toBe(15)
    expect(result[0].b).toBeCloseTo(150, 5)
  })

  it('filters out fully sold tickers', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 5, price: 100 },
      { id: '2', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-06-01', qty: 5, price: 200 },
    ]
    expect(deriveHoldings(txs)).toHaveLength(0)
  })

  it('handles multiple tickers independently', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 5, price: 100 },
      { id: '2', type: 'buy', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-01-02', qty: 3, price: 200 },
    ]
    const result = deriveHoldings(txs)
    expect(result).toHaveLength(2)
  })
})

describe('deriveRealizedGains', () => {
  it('returns empty array when no sell transactions', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
    ]
    expect(deriveRealizedGains(txs)).toHaveLength(0)
  })

  it('calculates gain using WAC: (sellPrice - avgCost) * qty', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-06-01', qty: 5, price: 200 },
    ]
    const gains = deriveRealizedGains(txs)
    expect(gains).toHaveLength(1)
    expect(gains[0].gain).toBeCloseTo(500, 5)
    expect(gains[0].avgCost).toBeCloseTo(100, 5)
    expect(gains[0].ticker).toBe('AAPL')
  })

  it('uses WAC across multiple buys before sell', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-01-01', qty: 10, price: 100 },
      { id: '2', type: 'buy', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-02-01', qty: 10, price: 200 },
      { id: '3', type: 'sell', ticker: 'TSLA', name: 'Tesla', currency: 'USD', date: '2024-03-01', qty: 10, price: 250 },
    ]
    const gains = deriveRealizedGains(txs)
    expect(gains[0].avgCost).toBeCloseTo(150, 5)
    expect(gains[0].gain).toBeCloseTo(1000, 5)
  })

  it('records a loss correctly', () => {
    const txs = [
      { id: '1', type: 'buy', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-01-01', qty: 10, price: 200 },
      { id: '2', type: 'sell', ticker: 'AAPL', name: 'Apple', currency: 'USD', date: '2024-06-01', qty: 10, price: 150 },
    ]
    const gains = deriveRealizedGains(txs)
    expect(gains[0].gain).toBeCloseTo(-500, 5)
  })
})
