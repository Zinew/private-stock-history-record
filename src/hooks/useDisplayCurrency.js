import { useLocalStorage } from './useLocalStorage.js'
import { useExchangeRate } from './useExchangeRate.js'

// 표시 통화·환율 훅 — 환율이 없으면 USD로 폴백, toDisplay로 금액 환산
export function useDisplayCurrency() {
  const [displayCurrencyRaw, setDisplayCurrency] = useLocalStorage('ledger_display_currency', 'USD')
  const [exchangeRate, setExchangeRate] = useLocalStorage('ledger_exchange_rate', { rate: null, updatedAt: null })

  useExchangeRate(setExchangeRate)

  const displayCurrency = exchangeRate.rate ? displayCurrencyRaw : 'USD'

  function toDisplay(amount, fromCurrency) {
    if (!exchangeRate.rate || fromCurrency === displayCurrency) return amount
    return displayCurrency === 'KRW'
      ? amount * exchangeRate.rate
      : amount / exchangeRate.rate
  }

  function toggleCurrency() {
    if (!exchangeRate.rate) return
    setDisplayCurrency(prev => prev === 'USD' ? 'KRW' : 'USD')
  }

  return { displayCurrency, exchangeRate, toDisplay, toggleCurrency }
}
