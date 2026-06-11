import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage.js'

// 자산 추이 스냅샷 훅 — 하루 1개 upsert, 최대 60개 유지.
// 자동 기록 트리거(가격 로딩 완료·거래 직후)는 usePortfolio가 소유하고 upsertTodaySnap을 호출한다.
// holdings 유무 가드는 호출자(usePortfolio effect)가 담당 — 여기는 total > 0만 확인
export function useSnapshots() {
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])

  const upsertTodaySnap = useCallback((total, currency) => {
    if (!(total > 0)) return
    const today = new Date().toISOString().slice(0, 10)
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    setSnaps(prev => {
      const idx = prev.findIndex(s => s.date === today)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], total, currency }
        return next
      }
      const next = [...prev, { label, total, currency, date: today }]
      return next.length > 60 ? next.slice(-60) : next
    })
  }, [setSnaps])

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  function deleteSnap(index) {
    setSnaps(snaps.filter((_, i) => i !== index))
  }

  function restoreSnap(snap, index) {
    const next = [...snaps]
    next.splice(index, 0, snap)
    setSnaps(next)
  }

  return { snaps, upsertTodaySnap, clearSnaps, deleteSnap, restoreSnap }
}
