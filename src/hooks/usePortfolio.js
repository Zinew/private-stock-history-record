import { useMemo, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { useTransactions } from './useTransactions.js'
import { useDisplayCurrency } from './useDisplayCurrency.js'
import { useLivePrices } from './useLivePrices.js'
import { useSnapshots } from './useSnapshots.js'

// 구형식 현금(숫자) → { amount, currency } 마이그레이션.
// 형태 가드 방식 — 멱등이며, 구형식 백업 import 후 새로고침 시에도 자동 변환
function migrateCashIfNeeded() {
  const raw = localStorage.getItem('ledger_cash')
  if (raw == null) return
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'number') return
    let currency = 'USD'
    try { currency = JSON.parse(localStorage.getItem('ledger_display_currency')) || 'USD' } catch { /* 기본 USD */ }
    localStorage.setItem('ledger_cash', JSON.stringify({ amount: parsed, currency }))
  } catch { /* 손상값 무시 */ }
}

migrateCashIfNeeded()

// 포트폴리오 파사드 — 하위 훅 4개를 조합하고, 교차 의존인 평가액 계산과
// 자동 스냅샷 트리거(가격 로딩 완료 시점 + 거래 직후)를 소유한다
export function usePortfolio() {
  const tx = useTransactions()
  const { displayCurrency, exchangeRate, toDisplay, toggleCurrency } = useDisplayCurrency()
  const live = useLivePrices(tx.holdings)
  const snap = useSnapshots()

  const [cash, setCash] = useLocalStorage('ledger_cash', { amount: 0, currency: 'USD' })
  const [targetWeights, setTargetWeightsRaw] = useLocalStorage('ledger_target_weights', {})

  const { holdings, realizedGains } = tx
  const { effectiveHoldings, priceLoading } = live

  const prevPriceLoading = useRef(false)
  const snapAfterTx = useRef(false)

  const holdingsVal = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)

  // 읽기 시점 인라인 가드 — 마이그레이션 전 시드·구형식 백업에도 안전
  const cashRaw = typeof cash === 'number'
    ? { amount: cash, currency: displayCurrency }
    : { amount: Number(cash?.amount) || 0, currency: cash?.currency || 'USD' }
  const cashDisplay = toDisplay(cashRaw.amount, cashRaw.currency)

  const totalVal = holdingsVal + cashDisplay
  const totalCost = effectiveHoldings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
  const pl = holdingsVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0

  const totalRealizedGain = useMemo(
    () => realizedGains.reduce((s, g) => s + toDisplay(g.gain, g.currency), 0),
    [realizedGains, displayCurrency, exchangeRate.rate]
  )

  function setTargetWeight(ticker, pct) {
    setTargetWeightsRaw(prev => {
      if (pct == null) {
        const next = { ...prev }
        delete next[ticker]
        return next
      }
      return { ...prev, [ticker]: Number(pct) }
    })
  }

  // 거래 추가를 래핑해 스냅샷 트리거 신호를 세팅 (useTransactions는 스냅샷을 모름)
  function addTransaction(args) {
    tx.addTransaction(args)
    snapAfterTx.current = true
  }

  // 자동 스냅샷 1: 가격 로딩이 끝나는 순간 기록
  useEffect(() => {
    if (prevPriceLoading.current && !priceLoading && holdings.length > 0 && totalVal > 0) {
      snap.upsertTodaySnap(totalVal, displayCurrency)
    }
    prevPriceLoading.current = priceLoading
  }, [priceLoading, totalVal, holdings.length, displayCurrency, snap.upsertTodaySnap])

  // 자동 스냅샷 2: 거래 직후 기록
  useEffect(() => {
    if (snapAfterTx.current && holdings.length > 0 && totalVal > 0) {
      snap.upsertTodaySnap(totalVal, displayCurrency)
      snapAfterTx.current = false
    }
  }, [totalVal, holdings.length, displayCurrency, snap.upsertTodaySnap])

  return {
    transactions: tx.transactions,
    holdings,
    effectiveHoldings,
    snaps: snap.snaps,
    displayCurrency,
    exchangeRate,
    cash: cashDisplay,
    cashRaw,
    setCash,
    targetWeights,
    setTargetWeight,
    totalVal,
    totalCost,
    pl,
    ret,
    realizedGains,
    totalRealizedGain,
    toDisplay,
    prices: live.prices,
    priceLoading,
    priceError: live.priceError,
    lastUpdatedAt: live.lastUpdatedAt,
    onRefresh: live.refresh,
    addTransaction,
    deleteTransaction: tx.deleteTransaction,
    editTransaction: tx.editTransaction,
    delHolding: tx.delHolding,
    editHolding: tx.editHolding,
    toggleCurrency,
    clearSnaps: snap.clearSnaps,
    deleteSnap: snap.deleteSnap,
    restoreSnap: snap.restoreSnap,
  }
}
