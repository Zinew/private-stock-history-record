# Ledger — 포트폴리오 트래커 React 앱 설계

## 개요

기존에 작성된 단일 HTML 파일(Ledger v1)을 Vite + React SPA로 전환한다. 디자인과 기능은 기존과 동일하게 유지하며, GitHub + Cloudflare Pages를 통해 배포한다.

## 기술 스택

- **빌드 도구**: Vite
- **UI 라이브러리**: React
- **차트**: Chart.js + react-chartjs-2
- **데이터 저장**: localStorage (브라우저 로컬)
- **스타일**: 기존 CSS 그대로 (CSS variables, Google Fonts)
- **배포**: Cloudflare Pages (GitHub 연동 자동 배포)

## 기능 범위

- 보유 종목 추가/삭제 (티커, 이름, 수량, 매수단가, 현재가 수동 입력)
- 총 평가액 / 총 매입액 / 평가손익 / 수익률 요약
- 자산 추이 라인 차트 (스냅샷 기록)
- 종목 비중 도넛 차트
- localStorage 자동 저장
- 실시간 시세 연동 없음 (수동 입력)

## 컴포넌트 구조

```
src/
├── App.jsx                   # 루트. holdings + snaps 상태 보유
├── components/
│   ├── Header.jsx            # 브랜드 로고 + 요약 통계 (평가액, 손익, 수익률)
│   ├── Charts.jsx            # LineChart + PieChart
│   ├── HoldingsTable.jsx     # 보유 종목 테이블 + 종목 추가 폼
│   └── SnapshotBar.jsx       # 스냅샷 기록 / 초기화 버튼
├── hooks/
│   └── useLocalStorage.js    # localStorage 자동 동기화 커스텀 훅
└── utils/
    └── format.js             # fmt($), pct(%) 포맷 함수
```

## 상태 구조

```js
// App.jsx
const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
const [snaps, setSnaps]       = useLocalStorage('ledger_snaps', [])

// holding 항목
{ t: string, nm: string, q: number, b: number, c: number }
// t: 티커, nm: 이름(선택), q: 수량, b: 매수단가, c: 현재가

// snap 항목
{ label: string, total: number }
// label: 'M/D HH:MM', total: 총 평가액
```

## 데이터 흐름

- App이 모든 상태를 보유하고 props로 하위 컴포넌트에 전달
- 상태 변경 함수(addHolding, delHolding, takeSnapshot, clearSnaps)도 App에 정의하여 props로 전달
- `useLocalStorage` 훅이 상태 변경 시 자동으로 localStorage 동기화

## 배포 구성

```
GitHub (main 브랜치 push)
    → Cloudflare Pages 자동 빌드
        빌드 명령어: npm run build
        출력 폴더: dist
    → 배포 URL (예: https://ledger.pages.dev)
```

- main 브랜치 push 시 자동 배포
- PR 생성 시 미리보기 URL 자동 생성

## 제외 범위

- 실시간 주가 API 연동 (향후 v2)
- 사용자 인증 / 클라우드 동기화
- 다중 포트폴리오 관리
