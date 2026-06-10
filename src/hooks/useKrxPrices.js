import { usePrices } from './usePrices.js'
import { fetchKrxQuote } from '../utils/stockSearch.js'

// 한국 주식 (KRX, Naver 프록시) 가격 조회 — 공통 로직은 usePrices 참고
const CONFIG = {
  getKey: h => h.t,
  fetchItem: h => fetchKrxQuote(h.t, h.exchange),
  errorKey: 'holdings.krxPriceError',
}

export function useKrxPrices(krwHoldings) {
  return usePrices(krwHoldings, CONFIG)
}
