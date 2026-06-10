import { usePrices } from './usePrices.js'
import { fetchQuote } from '../utils/finnhub.js'

// 미국 주식 (Finnhub) 가격 조회 — 공통 로직은 usePrices 참고
const CONFIG = {
  getKey: ticker => ticker,
  fetchItem: ticker => fetchQuote(ticker),
  errorKey: 'holdings.priceError',
}

export function useStockPrices(tickers) {
  return usePrices(tickers, CONFIG)
}
