import { useEffect } from 'react'

export function useExchangeRate(setExchangeRate) {
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        setExchangeRate({
          rate: data.rates.KRW,
          updatedAt: new Date().toISOString(),
        })
      })
      .catch(() => {
        // 실패 시 localStorage 캐시 유지 — setExchangeRate 호출 안 함
      })
  }, [])
}
