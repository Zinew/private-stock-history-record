import { useMemo } from 'react'
import { useStockPrices } from './useStockPrices.js'
import { useKrxPrices } from './useKrxPrices.js'

// 실시간 가격 조합 훅 — USD/KRW 보유종목을 나눠 조회하고 병합, 현재가 폴백(매수가) 적용
export function useLivePrices(holdings) {
  const usdTickers = useMemo(
    () => holdings.filter(h => h.currency === 'USD').map(h => h.t),
    [holdings]
  )
  const { prices: usdPrices, loading: usdLoading, error: usdError, lastUpdatedAt, refresh: refreshUsd } = useStockPrices(usdTickers)

  const krwHoldings = useMemo(
    () => holdings.filter(h => h.currency === 'KRW' && h.exchange).map(h => ({ t: h.t, exchange: h.exchange })),
    [holdings]
  )
  const { prices: krwPrices, loading: krwLoading, error: krwError, refresh: refreshKrw } = useKrxPrices(krwHoldings)

  const prices = useMemo(() => ({ ...usdPrices, ...krwPrices }), [usdPrices, krwPrices])
  const priceLoading = usdLoading || krwLoading
  const priceError = usdError || krwError || null

  const effectiveHoldings = useMemo(
    () => holdings.map(h => ({ ...h, c: prices[h.t] ?? h.b ?? 0 })),
    [holdings, prices]
  )

  function refresh() { refreshUsd(); refreshKrw() }

  return { prices, priceLoading, priceError, lastUpdatedAt, refresh, effectiveHoldings }
}
