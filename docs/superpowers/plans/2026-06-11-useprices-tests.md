# usePrices 재시도·경합 테스트 보강 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `usePrices` 훅의 미커버 경로(백그라운드 재시도 3s/6s/12s, 세대 경합, 신규 항목 감지)에 fake-timer 테스트 6개를 추가한다. 프로덕션 코드 변경 0.

**Architecture:** 래퍼를 거치지 않고 usePrices를 직접 테스트. `fetchItem`을 config로 주입받는 구조 덕분에 `vi.mock` 없이 mock 함수를 직접 넘긴다. 타이밍은 `vi.useFakeTimers` + `await act(async () => { await vi.advanceTimersByTimeAsync(N) })` 패턴 (useStockSearch.test.js에서 검증됨).

**Tech Stack:** Vitest (fake timers), @testing-library/react (renderHook/act)

**Spec:** `docs/superpowers/specs/2026-06-11-useprices-tests-design.md`

---

### Task 1: usePrices 직접 테스트 6개

**Files:**
- Create: `src/__tests__/hooks/usePrices.test.js`
- 프로덕션 코드 수정 금지 (`src/hooks/usePrices.js` 등). 테스트가 실패하면 먼저 훅의 실제 동작과 타이밍을 다시 추적해 **테스트 쪽**을 고친다. 추적 결과 훅의 실제 버그로 판명되면 수정하지 말고 BLOCKED로 보고.

- [ ] **Step 1: 테스트 파일 작성**

`src/__tests__/hooks/usePrices.test.js` 생성:

```js
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
```

- [ ] **Step 2: 신규 테스트 실행**

Run: `npx vitest run src/__tests__/hooks/usePrices.test.js`
Expected: 6 tests PASS — 기존 동작을 검증하는 테스트이므로 바로 통과해야 정상.

실패 시: `src/hooks/usePrices.js`를 읽고 타이밍을 재추적해 **테스트의 advance 호출**을 조정한다 (예: 마이크로태스크 플러시용 `await advance(0)` 추가). 프로덕션 코드는 절대 수정 금지. 훅의 실제 버그로 판명되면 BLOCKED 보고.

- [ ] **Step 3: 전체 테스트**

Run: `npm test`
Expected: 216 tests PASS (기존 210 + 신규 6, 기존 테스트 무수정)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add src/__tests__/hooks/usePrices.test.js
git commit -m "test: usePrices 재시도·세대 경합·신규 항목 감지 테스트 추가"
```
