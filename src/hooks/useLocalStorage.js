import { useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setStoredValue = newValue => {
    setValue(prev => {
      const valueToStore = typeof newValue === 'function' ? newValue(prev) : newValue
      localStorage.setItem(key, JSON.stringify(valueToStore))
      return valueToStore
    })
  }

  return [value, setStoredValue]
}
