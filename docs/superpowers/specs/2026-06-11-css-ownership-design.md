# 전역 테이블 셀렉터 소유권 정리 설계

**날짜:** 2026-06-11
**목표:** CSS 분리(2026-06-11) 리뷰의 후속 과제 2건 — holdings.css에 잘못 놓인 앱 전역 요소 스타일과 교차 파일 variant를 올바른 소유 파일로 이동한다. 렌더링 결과 변경 0.

## 배경 (CSS 분리 리뷰 지적)

1. **전역 요소 셀렉터가 토픽 파일에 있음:** `src/styles/holdings.css` 9-29행의 `table`, `th`, `th:first-child`, `td`, `td:first-child`, `tr:last-child td` — 클래스 없는 순수 요소 셀렉터라 앱의 모든 테이블(보유종목 + 리밸런싱 + 미래의 모든 테이블)에 적용된다. "holdings 스타일"을 고치다 전역을 깨뜨릴 수 있는 소유권 오류.
2. **교차 파일 variant:** `.currency-btn.sell-btn.active`(holdings.css 208행)이 본체 `.currency-btn`(layout.css 49행)과 떨어져 있음.

## 변경 내용

### 이동 1: 전역 테이블 스타일 → base.css

- holdings.css 9-29행의 6개 규칙(`table`/`th`/`th:first-child`/`td`/`td:first-child`/`tr:last-child td`)을 **그대로** base.css의 리셋(`* { ... }`) 직후 영역(현재 body 다음, `.wrap` 앞)으로 이동
- 이동 위치에 섹션 주석 추가: `/* 전역 테이블 기본 스타일 — 모든 <table>에 적용 (보유종목·리밸런싱 등) */`
- holdings.css에는 `.table-scroll`(holdings 전용 래퍼 클래스)만 남음

### 이동 2: sell-btn variant → layout.css

- holdings.css 208행 `.currency-btn.sell-btn.active { ... }`을 layout.css의 `.currency-btn.active`(60행) 규칙 바로 다음으로 이동
- holdings.css의 해당 줄과 주변 섹션 주석(`/* AddHoldingForm sell mode */`) 정리

## 캐스케이드 안전성 분석

- 순수 요소 셀렉터는 특이도 0-0-1 — 모든 클래스 규칙(0-1-0+)에 순서 무관하게 진다. base.css로 앞당겨져도 클래스 규칙과의 승부는 불변
- 같은 특이도 충돌 상대는 base.css의 리셋(`* {}`, 0-0-0)과 `body`뿐 — 리셋·body **뒤에** 배치하므로 현재 순서 유지
- base.css와 holdings.css 사이에 로드되는 layout.css에는 bare 테이블 셀렉터 없음 (확인됨)
- `.currency-btn.sell-btn.active`(0-3-0)는 `.currency-btn`(0-1-0)·`.currency-btn.active`(0-2-0)보다 특이도가 높아 위치 무관 — 단 layout.css가 holdings.css보다 먼저 로드되므로 **같은 특이도의 후속 규칙이 있는지** 확인 필요 → 없음 (`sell-btn` 셀렉터는 앱 전체에서 이 1건)

## 검증 기준

1. 전체 `npm test` 221개 무수정 통과
2. `npm run build` 성공 + 빌드 CSS에 이동한 셀렉터 전부 존재
3. dev 서버 육안: 보유종목 테이블·리밸런싱 테이블(데스크톱), 매수/매도 토글 버튼(매도 active 상태 빨간색) 동일

## 비범위 (YAGNI)

- 스타일 값 변경 없음 (순수 이동)
- 그 외 CSS 재구성 없음
