# 디자인 통일성 개선 설계

**날짜:** 2026-06-12
**목표:** 대시보드의 시각적 불일치 5건을 정리한다 — 섹션 순서, 입력 컨트롤 높이, 제출 버튼 색·라벨, 리밸런싱 카드 스타일, border-radius.

## 배경 (감사 결과)

1. 리밸런싱 가이드가 보유 종목 아래에 있어 "가이드 보고 거래"하는 흐름과 반대
2. addbar 입력 컨트롤 높이 제각각: `.field input` ≈38px, **`.addbar select` 중복 규칙**(패딩 6px, `.field select`와 동일 특이도 충돌)으로 매도 select만 낮음, 타입 토글은 패딩 5px·폰트 11px로 ≈27px, date 입력은 브라우저 네이티브 높이
3. 매수/매도 제출 버튼이 둘 다 `.btn`(민트) — 색으로 구분 안 됨. 라벨도 "+ 추가" vs "매도"로 형식 불일치
4. `.rebalancing-card`가 다른 섹션(`.holdings`: `--panel`/14px/22px)과 달리 `--panel-2`/12px/16px — HoldingsTable 내부 카드였던 시절의 잔재. 제목도 h3+전용 클래스로 따로 놂
5. radius: 입력 10px vs 버튼·토글 8px

## 변경 내용

### 1. 섹션 순서 (`src/pages/DashboardPage.jsx`)

`<RebalancingGuide ...>` JSX 블록을 `<HoldingsTable ...>` 앞으로 이동. 최종 순서: Charts → RebalancingGuide → HoldingsTable → TransactionHistory → BackupBar.

### 2. 입력 컨트롤 높이 38px 통일 (`src/styles/holdings.css`, `src/styles/layout.css`)

- `.field input, .field select` 규칙에 `height: 38px; box-sizing: border-box;` 추가
- `.field select { width: auto; min-width: 170px }` 규칙 추가 (매도 종목 select 폭 확보)
- `.addbar select { ... }`와 `.addbar select:focus { ... }` 규칙 **삭제** (중복·충돌 제거 — `.field input, .field select` 규칙이 적용됨)
- `.currency-toggle`에 `height: 38px;` 추가 (layout.css)
- `.currency-btn` 패딩 `5px 12px` → `0 14px`, 폰트 `11px` → `12px` (38px 박스를 flex stretch로 채움)

### 3. 제출 버튼 색·라벨 (`holdings.css`, `AddHoldingForm.jsx`, 로케일, 테스트)

- `.btn.danger` 신설 (`.btn.ghost` 다음에 배치):
```css
.btn.danger { background: var(--loss) }
.btn.danger:hover { background: #f08672 }
```
(글자색은 `.btn`의 `#0c0e0d` 상속 — 민트 버튼과 동일 패턴)
- `AddHoldingForm.jsx` 매도 제출 버튼: `className="btn danger"`, 라벨 `t('tx.sellSubmit')`
- 로케일: `addHolding.addButton` — ko `"+ 추가"`→`"+ 매수"`, en `"+ Add"`→`"+ Buy"`. `tx.sellSubmit` 신설 — ko `"+ 매도"`, en `"+ Sell"`. (`tx.sell`은 토글·뱃지 공용이라 불변. ko.json 105행의 다른 섹션 `addButton`은 캘린더용 — 불변)
- `src/__tests__/components/HoldingsTable.test.jsx`의 `getByText('+ 추가')` 4곳 → `getByText('+ 매수')` — **의도된 라벨 변경에 따른 갱신** (이번 작업에서 유일하게 허용되는 테스트 수정)

### 4. 리밸런싱 카드 섹션 승격 (`rebalancing.css`, `RebalancingGuide.jsx`)

- `.rebalancing-card`: `background: var(--panel-2)`→`var(--panel)`, `border-radius: 12px`→`14px`, `padding: 16px`→`22px`, `margin-top: 12px`→`margin-bottom: 20px`
- `RebalancingGuide.jsx`: `<h3 className="rebalancing-title">`→`<h2 className="holdings-title">` (닫는 태그 포함)
- `.rebalancing-title` 규칙 삭제 (홀로 쓰던 클래스). 단 제목과 표 사이 간격은 기존 `.rebalancing-title`의 `margin: 0 0 12px`가 담당했으므로, `.holdings-title`(margin: 0)로 바꾸면 간격이 사라짐 → `.rebalancing-card .holdings-title { margin-bottom: 12px }` 보정 규칙을 rebalancing.css에 추가
- RebalancingGuide.test.jsx는 텍스트(`리밸런싱 가이드`)로 조회하므로 태그 변경 영향 없음

### 5. radius 통일 (`holdings.css`, `layout.css`)

- `.btn` `border-radius: 8px`→`10px`
- `.currency-toggle` `border-radius: 8px`→`10px`

## 검증 기준

1. `npm test` — HoldingsTable.test.jsx 4곳 갱신 후 221개 전부 통과
2. `npm run build` 성공
3. dev 서버 육안: ① addbar의 모든 컨트롤(토글·date·검색·숫자 3개·버튼)이 같은 높이로 한 줄 정렬 ② 매도 모드 select 높이·폭 정상 ③ 매도 제출 버튼 레드/매수 민트, 라벨 "+ 매수"/"+ 매도" ④ 리밸런싱 가이드가 보유 종목 위, 카드 모양·제목이 다른 섹션과 동일 ⑤ 모바일(640px)에서 깨짐 없음

## 비범위 (YAGNI)

- 모바일 카드뷰 레이아웃, 색 팔레트 변수 자체, 캘린더/뉴스/모달 디자인 변경 없음
- 컴포넌트 구조 변경 없음 (JSX는 라벨·클래스·태그·순서만)
