import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchUsdSearch, fetchKrxSearch } from '../utils/stockSearch.js'

const DEBOUNCE_MS = 300
const MAX_RESULTS = 8

// 종목 검색 훅 — KRX/USD 동시 검색, 디바운스, 드롭다운 상태 관리.
//   search(query): 디바운스 후 검색 실행. 빈 쿼리는 즉시 초기화 (API 미호출)
//   clear():       대기 중·진행 중 검색 무효화 + 결과/드롭다운 초기화 (제출·모드 전환용)
//   close():       드롭다운만 닫기 (input blur용)
export function useStockSearch() {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const genRef = useRef(0)

  useEffect(() => { return () => { genRef.current++; clearTimeout(debounceRef.current) } }, [])

  const search = useCallback((query) => {
    const gen = ++genRef.current
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const [krwResults, usdResults] = await Promise.all([
        fetchKrxSearch(query),
        fetchUsdSearch(query),
      ])
      if (gen !== genRef.current) return
      const all = [
        ...krwResults.map(r => ({ ...r, market: r.exchange === 'KS' ? 'KOSPI' : 'KOSDAQ' })),
        ...usdResults.map(r => ({ ...r, market: 'US' })),
      ].slice(0, MAX_RESULTS)
      setResults(all)
      setOpen(all.length > 0)
    }, DEBOUNCE_MS)
  }, [])

  const clear = useCallback(() => {
    genRef.current++
    clearTimeout(debounceRef.current)
    setResults([])
    setOpen(false)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  return { results, open, search, clear, close }
}
