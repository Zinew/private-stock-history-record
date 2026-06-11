import { useState, useCallback } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // setter 정체성 안정화 — 이 setter에 의존하는 useCallback(예: useSnapshots.upsertTodaySnap)이
  // 렌더마다 재생성되지 않도록 한다 (key·setValue만 클로저로 잡으므로 [key]면 충분)
  const setStoredValue = useCallback(newValue => {
    setValue(prev => {
      const valueToStore = typeof newValue === 'function' ? newValue(prev) : newValue
      localStorage.setItem(key, JSON.stringify(valueToStore))
      return valueToStore
    })
  }, [key])

  return [value, setStoredValue]
}
