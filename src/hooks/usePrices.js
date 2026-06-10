import { useState, useCallback, useEffect, useRef } from 'react'
import i18n from '../i18n.js'

const INTER_REQUEST_DELAY = 300  // ms between sequential item fetches
const RETRY_DELAYS = [3000, 6000, 12000]  // background retry schedule (ms)

// 공통 가격 조회 훅.
//   items:     조회 대상 배열 (형태 무관)
//   getKey:    item → prices 맵의 키 (신규 항목 감지에도 사용)
//   fetchItem: item → Promise<price | null> (null = 실패, 절대 reject하지 않아야 함 — 내부에서 catch할 것)
//   errorKey:  첫 패스 전부 실패 시 사용할 i18n 키
//   반환: { prices, loading, error, lastUpdatedAt, refresh }
//   동작: 첫 패스 전부 실패 시에만 error 설정, 부분 성공은 prices에 병합.
//        자동 재조회는 새 키가 추가될 때만 (항목 제거는 재조회 안 함).
export function usePrices(items, config) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const itemsRef = useRef(items)
  const prevKeysRef = useRef([])
  const hasFetchedRef = useRef(false)
  const fetchGenRef = useRef(0)
  const configRef = useRef(config)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { configRef.current = config }, [config])

  const fetchAll = useCallback(() => {
    const gen = ++fetchGenRef.current
    const list = itemsRef.current
    const { getKey, fetchItem, errorKey } = configRef.current
    if (list.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      let failed = []
      try {
        const result = {}
        for (let i = 0; i < list.length; i++) {
          const item = list[i]
          const price = await fetchItem(item)
          if (price !== null) result[getKey(item)] = price
          else failed.push(item)
          if (i < list.length - 1) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY))
        }
        if (gen !== fetchGenRef.current) return
        if (Object.keys(result).length === 0) {
          setError(i18n.t(errorKey))
        } else {
          setPrices(prev => ({ ...prev, ...result }))
          setLastUpdatedAt(new Date())
        }
      } finally {
        if (gen === fetchGenRef.current) setLoading(false)
      }

      // Background retry — no loading spinner, silently fills in failed items
      for (const delay of RETRY_DELAYS) {
        if (gen !== fetchGenRef.current || failed.length === 0) break
        await new Promise(r => setTimeout(r, delay))
        if (gen !== fetchGenRef.current) break
        const retryResult = {}
        const nextFailed = []
        for (let i = 0; i < failed.length; i++) {
          const item = failed[i]
          const price = await fetchItem(item)
          if (price !== null) retryResult[getKey(item)] = price
          else nextFailed.push(item)
          if (i < failed.length - 1) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY))
        }
        if (gen !== fetchGenRef.current) break
        if (Object.keys(retryResult).length > 0) {
          setPrices(prev => ({ ...prev, ...retryResult }))
          setLastUpdatedAt(new Date())
        }
        failed = nextFailed
      }
    })()
  }, [])

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      prevKeysRef.current = items.map(configRef.current.getKey)
      fetchAll()
      return
    }
    const keys = items.map(configRef.current.getKey)
    const hasNew = keys.some(k => !prevKeysRef.current.includes(k))
    prevKeysRef.current = keys
    if (hasNew) fetchAll()
  }, [items, fetchAll])

  return { prices, loading, error, lastUpdatedAt, refresh: fetchAll }
}
