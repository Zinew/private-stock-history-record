# 전역 테이블 셀렉터 소유권 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** holdings.css의 앱 전역 요소 스타일(table/th/td)을 base.css로, 교차 파일 variant(.sell-btn)를 layout.css로 이동한다. 렌더링 결과 변경 0.

**Architecture:** 순수 줄 이동 (스타일 값 변경 없음). 캐스케이드 안전성은 스펙에서 분석 완료 — 요소 셀렉터(0-0-1)는 클래스 규칙에 순서 무관하게 지고, base.css 내 배치는 리셋·body 뒤이므로 순서 보존. 검증은 기존 테스트 + 빌드 CSS 셀렉터 확인 + 육안.

**Tech Stack:** CSS (Vite @import 번들)

**Spec:** `docs/superpowers/specs/2026-06-11-css-ownership-design.md`

---

### Task 1: 셀렉터 이동 2건

**Files:**
- Modify: `src/styles/base.css` (전역 테이블 블록 삽입)
- Modify: `src/styles/holdings.css` (테이블 블록 + sell-btn 제거)
- Modify: `src/styles/layout.css` (sell-btn 삽입)

- [ ] **Step 1: holdings.css에서 전역 테이블 블록 잘라내기**

`src/styles/holdings.css`에서 아래 블록(현재 9-29행, `.table-scroll` 다음부터 `.tick` 앞까지)을 **삭제**한다. 삭제할 내용 (base.css로 옮길 것이므로 정확히 보존):

```css
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; min-width: 680px }
th {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--ink-faint);
  text-align: right;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  font-weight: 500;
}
th:first-child { text-align: left }
td {
  padding: 13px 12px;
  text-align: right;
  font-size: 14px;
  border-bottom: 1px solid rgba(39,48,44,.5);
}
td:first-child { text-align: left }
tr:last-child td { border-bottom: none }
```

`.table-scroll { overflow-x: auto }`(holdings 전용 래퍼)와 `.tick` 이하는 holdings.css에 남긴다.

- [ ] **Step 2: base.css에 삽입**

`src/styles/base.css`에서 `body { ... }` 블록의 닫는 `}` 다음, `.wrap` 규칙 앞에 아래를 삽입한다 (Step 1에서 삭제한 블록 + 안내 주석):

```css

/* 전역 테이블 기본 스타일 — 모든 <table>에 적용 (보유종목·리밸런싱 등) */
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; min-width: 680px }
th {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--ink-faint);
  text-align: right;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  font-weight: 500;
}
th:first-child { text-align: left }
td {
  padding: 13px 12px;
  text-align: right;
  font-size: 14px;
  border-bottom: 1px solid rgba(39,48,44,.5);
}
td:first-child { text-align: left }
tr:last-child td { border-bottom: none }
```

- [ ] **Step 3: sell-btn variant 이동**

1. `src/styles/holdings.css`에서 아래 줄(현재 208행)과 바로 위의 `/* AddHoldingForm sell mode */` 주석을 **삭제**:

```css
/* AddHoldingForm sell mode */
.currency-btn.sell-btn.active { background: rgba(232,101,79,.15); color: #e8654f; border-color: #e8654f; }
```

2. `src/styles/layout.css`의 `.currency-btn.active { ... }` 규칙(현재 60행 시작)의 닫는 `}` 바로 다음에 삽입:

```css
.currency-btn.sell-btn.active { background: rgba(232,101,79,.15); color: #e8654f; border-color: #e8654f; }
```

- [ ] **Step 4: 검증 — 테스트·빌드·셀렉터 보존**

Run: `npm test` → Expected: 221 PASS
Run: `npm run build` → Expected: 성공

빌드 CSS 셀렉터 보존 확인 (Bash):
```bash
css=$(cat dist/assets/*.css)
for sel in "font-variant-numeric" "tr:last-child td" ".sell-btn.active" ".table-scroll"; do
  echo "$css" | grep -qF "$sel" || echo "MISSING: $sel"
done
```
Expected: MISSING 출력 없음.

추가 확인 — bare 테이블 셀렉터가 holdings.css에서 사라졌는지:
```bash
grep -nE "^(table|th|td|tr)[ :{]" src/styles/holdings.css
```
Expected: 출력 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/styles/base.css src/styles/holdings.css src/styles/layout.css
git commit -m "refactor: 전역 테이블 스타일을 base.css로, sell-btn variant를 layout.css로 이동"
```

---

### Task 2: 육안 검증 (사용자 확인)

- [ ] dev 서버(localhost:5173)에서 확인 요청: ① 보유종목 테이블(데스크톱) 모양 동일 ② 리밸런싱 가이드 테이블 동일 ③ 매수/매도 토글에서 매도 선택 시 빨간 active 스타일 동일
