import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrices } from '../../hooks/usePrices.js'

// fetchItem을 config로 주입받으므로 vi.mock 불필요
const mockFetch = vi.fn()
const CONFIG = {
  getKey: k => k,
  fetchItem: k => mockFetch(k),
  errorKey: 'holdings.priceError',
}

// 마이크로태스크 + 타이머를 N ms만큼 진행
async function advance(ms) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

beforeEach(() => {
  vi.useFakeTimers()
  mockFetch.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePrices — 재시도·세대 경합·신규 항목 감지', () => {
  it('부분 실패는 3초 후 백그라운드 재시도로 채워진다', async () => {
    let bPrice = null
    mockFetch.mockImplementation(async key => (key === 'A' ? 100 : bPrice))
    const { result } = renderHook(() => usePrices(['A', 'B'], CONFIG))

    // 첫 패스: A 성공, (300ms 딜레이 후) B 실패
    await advance(300)
    expect(result.current.prices).toEqual({ A: 100 })
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    const firstUpdatedAt = result.current.lastUpdatedAt

    // 3초 후 재시도에서 B 성공
    bPrice = 200
    await advance(3000)
    expect(result.current.prices).toEqual({ A: 100, B: 200 })
    expect(result.current.lastUpdatedAt.getTime()).toBeGreaterThan(firstUpdatedAt.getTime())
  })

  it('재시도 3회(3s/6s/12s) 모두 실패하면 더 이상 호출하지 않는다', async () => {
    mockFetch.mockResolvedValue(null)
    const { result } = renderHook(() => usePrices(['X'], CONFIG))

    await advance(0)
    expect(mockFetch).toHaveBeenCalledTimes(1) // 첫 패스
    expect(result.current.error).toBeTruthy()

    await advance(3000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    await advance(6000)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    await advance(12000)
    expect(mockFetch).toHaveBeenCalledTimes(4)

    // 스케줄 소진 후 추가 호출 없음
    await advance(60000)
    expect(mockFetch).toHaveBeenCalledTimes(4)
    expect(result.current.prices).toEqual({})
  })

  it('재시도 대기 중 refresh()하면 구세대 재시도는 폐기된다', async () => {
    mockFetch.mockResolvedValueOnce(null) // 구세대 첫 패스: 실패
    mockFetch.mockResolvedValue(500)      // 이후 전부 성공
    const { result } = renderHook(() => usePrices(['X'], CONFIG))

    await advance(0)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeTruthy()

    // 구세대가 3초 재시도를 기다리는 동안 refresh
    act(() => { result.current.refresh() })
    await advance(0)
    expect(result.current.prices).toEqual({ X: 500 })
    expect(result.current.error).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // 구세대 재시도 타이머가 만료돼도 추가 호출 없음 (세대 가드)
    await advance(60000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.current.prices).toEqual({ X: 500 })
  })

  it('신규 키가 추가되면 자동 재조회한다', async () => {
    mockFetch.mockResolvedValue(10)
    const { rerender } = renderHook(({ items }) => usePrices(items, CONFIG), {
      initialProps: { items: ['A'] },
    })

    await advance(0)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    rerender({ items: ['A', 'B'] })
    await advance(300) // 전체 리스트 재조회 (A, B — 사이 300ms)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockFetch).toHaveBeenCalledWith('B')
  })

  it('항목 제거는 재조회하지 않는다', async () => {
    mockFetch.mockResolvedValue(10)
    const { rerender } = renderHook(({ items }) => usePrices(items, CONFIG), {
      initialProps: { items: ['A', 'B'] },
    })

    await advance(300)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    rerender({ items: ['A'] })
    await advance(60000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('백그라운드 재시도 중에는 로딩 스피너를 켜지 않는다', async () => {
    mockFetch.mockResolvedValue(null)
    const { result } = renderHook(() => usePrices(['X'], CONFIG))

    await advance(0)
    expect(result.current.loading).toBe(false) // 첫 패스 종료

    await advance(1500) // 3초 재시도 대기 중간
    expect(result.current.loading).toBe(false)

    await advance(1500) // 재시도 1회차 실행 직후
    expect(result.current.loading).toBe(false)

    await advance(6000) // 재시도 2회차
    expect(result.current.loading).toBe(false)
  })
})
