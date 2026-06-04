import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalStorage', () => {
  it('초기값 반환', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', []))
    expect(result.current[0]).toEqual([])
  })

  it('localStorage에 저장된 값 불러오기', () => {
    localStorage.setItem('test_key', JSON.stringify([{ id: 1 }]))
    const { result } = renderHook(() => useLocalStorage('test_key', []))
    expect(result.current[0]).toEqual([{ id: 1 }])
  })

  it('값 변경 시 localStorage에 저장', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', []))
    act(() => {
      result.current[1]([{ id: 2 }])
    })
    expect(JSON.parse(localStorage.getItem('test_key'))).toEqual([{ id: 2 }])
  })
})
