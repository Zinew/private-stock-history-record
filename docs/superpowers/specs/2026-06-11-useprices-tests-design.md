# usePrices 재시도·경합 테스트 보강 설계

**날짜:** 2026-06-11
**목표:** `usePrices` 훅의 미커버 경로(백그라운드 재시도 3s/6s/12s, 세대 경합, 신규 항목 감지)에 fake-timer 테스트를 추가한다. **프로덕션 코드 변경 0** — 순수 테스트 추가.

## 배경

`usePrices`(공통 가격 조회 훅)는 래퍼 테스트 11개가 성공/전체실패/빈배열/refresh 경로를 커버하지만, **재시도 루프(3s/6s/12s)·세대 가드·신규 항목 감지는 커버리지 0**이다. 기존 테스트가 실제 타이머 + `waitFor` 방식이라 21초짜리 재시도 스케줄을 검증할 수 없었기 때문. 이 영역은 앱에서 역사적으로 버그가 가장 잦았던 곳이고(가격 조회 안정성 개선 이력), 훅 통합으로 한 파일에 모인 지금이 안전망을 깔 적기다.

`useStockSearch.test.js`에서 검증된 fake-timer 패턴(`vi.useFakeTimers` + `await act(async () => { await vi.advanceTimersByTimeAsync(N) })`)을 재사용한다.

## 구조

### 새 파일: `src/__tests__/hooks/usePrices.test.js`

- 래퍼를 거치지 않고 `usePrices`를 **직접 테스트** — 재시도 로직은 공유 코드이므로 원천에서 검증. 기존 래퍼 테스트 11개는 무수정 유지
- 테스트용 config를 모듈 레벨 또는 테스트 내 정의: `getKey: x => x`, `fetchItem: mockFetch`, `errorKey: 'holdings.priceError'`
- `mockFetch = vi.fn()`을 직접 주입하므로 `vi.mock` 불필요 (usePrices는 fetchItem을 config로 받음 — 외부 모듈 모킹 없이 테스트 가능)
- i18n은 실제 인스턴스 사용 (기존 훅 테스트와 동일)

### 테스트 시나리오 6개

1. **부분 실패 → 3s 후 백그라운드 재시도로 채워짐**: 항목 2개 중 1개 실패(null). 첫 패스 후 성공분만 prices에 있고 error 없음. 3초(+inter-request delay) 경과 후 실패분 재시도 성공 → prices 병합 + `lastUpdatedAt` 갱신
2. **재시도 3회 전부 실패 → 중단**: 항목 1개가 계속 null. 21초+ 경과 후 fetchItem 총 호출 수가 정확히 4회(첫 패스 1 + 재시도 3), 이후 추가 호출 없음, prices에 미반영
3. **재시도 대기 중 refresh() → 구세대 재시도 폐기**: 첫 fetch 실패 → 재시도 대기 중 `refresh()` → 구세대 재시도 흐름이 중단되고(세대 가드) 새 fetch 결과만 반영. fetchItem 호출 시퀀스로 검증
4. **신규 키 추가 시에만 자동 재조회**: `rerender`로 items에 새 키 추가 → fetch 발생 (추가된 시점 이후 호출 수 증가)
5. **항목 제거는 재조회 안 함**: `rerender`로 items에서 키 제거 → 추가 fetch 없음
6. **재시도 중 로딩 스피너 없음**: 첫 패스 완료 후(`loading === false`) 재시도 구간 내내 `loading`이 `false` 유지

타이밍 단언은 구현 상수(300ms inter-request, 3s/6s/12s)에 의존하되, 상수 변경 시 테스트가 깨지는 것은 의도된 동작(스케줄 자체가 스펙).

## 검증 기준

1. 신규 6개 테스트 통과
2. 기존 210개 테스트 **무수정** 전부 통과 (총 216)
3. `npm run build` 성공

## 비범위 (YAGNI)

- 프로덕션 코드(`usePrices.js` 등) 변경 없음 — 단, 테스트 작성 중 실제 버그가 드러나면 수정하지 말고 BLOCKED로 보고 (수정 여부는 별도 결정)
- 기존 래퍼 테스트 재구성 없음
- 언마운트 경로 테스트는 제외 (훅이 앱 수명 내내 살아있는 usePortfolio 소유라 실익 낮음)
