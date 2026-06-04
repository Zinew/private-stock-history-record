# Ledger 다통화 지원 설계

## 개요

USD 전용이던 Ledger에 KRW(원화) 지원을 추가한다. 종목별로 통화를 지정하고, 헤더 토글로 전체 표시 통화를 USD ↔ KRW로 전환한다. 환율은 frankfurter.app에서 자동 조회한다.

## 기능 범위

- 종목 추가 폼에 통화 선택(USD / KRW) 추가
- 헤더 우측에 USD ↔ KRW 토글 버튼 + 환율 및 마지막 업데이트 시각 표시
- 앱 로드 시 frankfurter.app에서 USD→KRW 환율 자동 조회, localStorage 캐싱
- 환율 조회 실패 시 캐시된 환율 사용 (캐시도 없으면 토글 비활성화)
- 표시 통화 전환 시 평가액·손익·헤더 요약 수치 모두 환산

## 데이터 모델

```js
// holding (기존 + currency 추가)
{ t: string, nm: string, q: number, b: number, c: number, currency: 'USD' | 'KRW' }

// 기존 holding (currency 없음) → 로드 시 'USD'로 처리

// 새 localStorage 키
'ledger_display_currency'  → 'USD' | 'KRW'  (기본: 'USD')
'ledger_exchange_rate'     → { rate: number, updatedAt: string } | { rate: null, updatedAt: null }
```

## 환율 조회

**API:** `https://api.frankfurter.app/latest?from=USD&to=KRW`

**응답 예:**
```json
{ "rates": { "KRW": 1380.12 } }
```

**훅:** `src/hooks/useExchangeRate.js`
- 마운트 시 fetch 실행
- 성공: rate와 updatedAt(ISO string) 저장
- 실패: localStorage 캐시 유지, 상태에 `error: true` 표시

## 환산 로직 (App.jsx)

```js
function toDisplay(amount, fromCurrency) {
  if (!exchangeRate.rate || fromCurrency === displayCurrency) return amount
  return displayCurrency === 'KRW'
    ? amount * exchangeRate.rate
    : amount / exchangeRate.rate
}

// 총액 계산 시 적용
const totalVal  = holdings.reduce((s, h) => s + toDisplay(h.q * h.c, h.currency ?? 'USD'), 0)
const totalCost = holdings.reduce((s, h) => s + toDisplay(h.q * h.b, h.currency ?? 'USD'), 0)
```

## 포맷 함수 (format.js)

```js
// 기존 유지
export const fmt = n => ...  // $1,234.50

// 추가
export const fmtKRW = n =>
  (n < 0 ? '-' : '') + '₩' + Math.abs(n).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
// → ₩1,234,000

export const fmtCurrency = (n, currency) =>
  currency === 'KRW' ? fmtKRW(n) : fmt(n)
```

## 컴포넌트 변경

### Header.jsx

새 props 추가: `displayCurrency`, `onToggleCurrency`, `exchangeRate`

- 우측에 USD | KRW 토글 버튼 추가 (활성 탭 강조)
- 환율 표시: `1 USD = ₩1,380 · 방금 업데이트` (updatedAt 기준)
- 환율 조회 실패 + 캐시 없으면: 토글 버튼 숨김, displayCurrency를 'USD'로 강제, 요약 수치 USD로 표시
- 요약 수치 포맷: `fmtCurrency(val, displayCurrency)`

### HoldingsTable.jsx

새 props 추가: `displayCurrency`, `exchangeRate`

**추가 폼:**
- 티커 입력 오른쪽에 USD | KRW 토글 버튼 추가
- 매수단가 · 현재가 placeholder를 선택 통화에 따라 변경
  - USD: `150`, KRW: `75000`

**테이블 행:**
- 매수가 · 현재가: `fmtCurrency(price, h.currency ?? 'USD')` — 종목 원래 통화
- 평가액 · 손익: `fmtCurrency(toDisplay(val, h.currency), displayCurrency)` — 표시 통화
- 컬럼 헤더 "평가액" → "평가액 ($)" 또는 "평가액 (₩)" 으로 표시 통화 명시
- 손익 컬럼도 동일하게 표시 통화 명시

### App.jsx

- `displayCurrency` 상태 추가 (`useLocalStorage`)
- `exchangeRate` 상태 추가 (`useLocalStorage`)
- `useExchangeRate` 훅으로 환율 조회 후 `setExchangeRate` 호출
- `toDisplay()` 헬퍼 함수 추가
- `totalVal`, `totalCost` 계산 시 `toDisplay` 적용
- `takeSnapshot` — snap에 `currency: displayCurrency` 저장. 라인 차트는 현재 displayCurrency와 일치하는 snap만 표시 (통화 전환 시 이전 통화 snap은 숨김, 데이터는 보존)

### Charts.jsx

- `displayCurrency` prop 추가
- Y축 tick callback: `displayCurrency === 'KRW' ? '₩' + v.toLocaleString() : '$' + v.toLocaleString()`
- 툴팁: `fmtCurrency(val, displayCurrency)`

## 새 파일

### src/hooks/useExchangeRate.js

```js
// 인터페이스
useExchangeRate(setExchangeRate)
// - 마운트 시 frankfurter.app fetch
// - 성공: setExchangeRate({ rate, updatedAt })
// - 실패: 아무것도 하지 않음 (캐시 유지)
```

## 테스트 계획

- `fmtKRW`: 양수, 0, 음수, 소수점 반올림 테스트
- `fmtCurrency`: USD → fmt 위임, KRW → fmtKRW 위임
- `HoldingsTable`: 통화 토글 시 placeholder 변경, onAdd에 currency 포함
- `Header`: 토글 클릭 시 onToggleCurrency 호출

## 제외 범위

- 환율 자동 갱신 주기 (앱 로드 시 1회만)
- USD/KRW 외 다른 통화 (JPY, EUR 등)
- 실시간 주가 연동
