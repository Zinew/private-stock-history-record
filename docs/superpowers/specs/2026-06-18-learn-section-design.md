# Learn 섹션 설계 — AdSense 승인을 위한 투자 가이드 콘텐츠

**날짜:** 2026-06-18  
**목표:** 애드센스 "가치가 낮은 콘텐츠" 거절 극복, 장기 SEO + 수익화 구조 구축  
**접근 방식:** 기존 Ledger React 앱에 `/learn` 콘텐츠 섹션 통합

---

## 1. 아키텍처

### 라우트
- `/learn` — 글 목록 (`LearnPage.jsx`)
- `/learn/:slug` — 개별 글 (`ArticlePage.jsx`)

### 글 저장
- `src/content/articles/*.md` — 마크다운 파일로 관리
- Vite `import.meta.glob`으로 빌드 시 전체 파일 수집
- `gray-matter` (frontmatter 파싱) + `marked` (본문 → HTML 변환)

### 사이드바
- 기존 메뉴에 "투자 가이드" 항목 추가 → `/learn`

### 신규 의존성
- `gray-matter` — frontmatter 파싱
- `marked` — 마크다운 → HTML

---

## 2. 콘텐츠 구조

### 마크다운 frontmatter
```yaml
---
title: "리밸런싱이란 무엇인가?"
slug: "what-is-rebalancing"
date: "2026-06-18"
description: "포트폴리오 리밸런싱의 개념과 실전 방법"
tags: ["리밸런싱", "포트폴리오"]
---
```

### 파일 구조
```
src/content/articles/
  what-is-rebalancing.md
  portfolio-diversification.md
  average-cost-calculation.md
  realized-vs-unrealized-pnl.md
  target-weight-setting.md
  us-stock-for-beginners.md
  exchange-rate-impact.md
  kospi-vs-sp500.md
  us-etf-guide.md
  tax-basics-for-korean-investors.md

public/learn/images/
  [AI 생성 이미지 — ChatGPT/Gemini로 직접 생성 후 저장]
```

### 초기 글 목록 (10편, 각 800~1,200단어)

| # | 슬러그 | 제목 | 카테고리 |
|---|---|---|---|
| 1 | `what-is-rebalancing` | 리밸런싱이란? 언제 어떻게 해야 하나 | 실전 가이드 |
| 2 | `portfolio-diversification` | 분산 투자의 원칙 — 얼마나 나눠야 할까 | 실전 가이드 |
| 3 | `average-cost-calculation` | 평균 매수가 계산법과 물타기의 진실 | 실전 가이드 |
| 4 | `realized-vs-unrealized-pnl` | 실현손익 vs 평가손익, 뭐가 다를까 | 실전 가이드 |
| 5 | `target-weight-setting` | 포트폴리오 목표 비중 설정하는 법 | 실전 가이드 |
| 6 | `us-stock-for-beginners` | 서학개미 입문 — 미국 주식 처음 시작하기 | 서학개미 |
| 7 | `exchange-rate-impact` | 환율이 내 포트폴리오에 미치는 영향 | 서학개미 |
| 8 | `kospi-vs-sp500` | KOSPI vs S&P500 — 두 시장 비교 | 서학개미 |
| 9 | `us-etf-guide` | 미국 ETF 종류 가이드 (SPY, QQQ, SCHD) | 서학개미 |
| 10 | `tax-basics-for-korean-investors` | 서학개미가 꼭 알아야 할 세금 기초 | 서학개미 |

---

## 3. 컴포넌트 설계

### LearnPage.jsx
- 글 목록을 카드 형태로 표시
- 각 카드: SVG 썸네일 + 제목 + 날짜 + 예상 읽기 시간 + 미리보기 텍스트
- 상단 가로 광고 배너 1개

### ArticlePage.jsx
- SVG 헤더 일러스트 (주제별 개별 제작)
- 제목 + 날짜 + 읽기 시간
- 광고 배너 (제목 아래)
- 마크다운 → HTML 렌더링 (`.learn-content` 클래스)
- AI 생성 이미지 (본문 중간, `public/learn/images/` 에서 로드)
- 광고 배너 (글 하단)
- 이전 글 / 다음 글 네비게이션

### AdBanner.jsx
- 단일 컴포넌트로 모든 광고 위치 처리
- `slot` prop으로 위치별 AdSense 코드 주입
- 모바일(640px 이하)에서 사이드바 광고 숨김

### 스타일
- `src/styles/learn.css` 신규 추가
- 기존 `.static-section`, `.holdings-title` 클래스 재활용
- 다크 테마 + 골드 색상 통일

---

## 4. 이미지 전략

### SVG 헤더 일러스트
- 각 글마다 주제에 맞는 SVG를 코드로 직접 제작
- 예: 리밸런싱 글 → 파이 차트 분할 일러스트
- 예: 환율 글 → 원-달러 아이콘
- Ledger 다크 테마 색상 (#1e293b 배경, #f59e0b 골드 포인트) 통일

### AI 생성 이미지 (본문 중간)
- ChatGPT/Gemini로 직접 생성
- 각 글마다 프롬프트 제공 예정
- 저장 경로: `public/learn/images/{slug}.webp`

---

## 5. 광고 배치

| 위치 | 형태 | 조건 |
|---|---|---|
| `/learn` 목록 상단 | 가로 배너 (728×90) | 항상 표시 |
| `/learn/:slug` 글 상단 | 가로 배너 | 항상 표시 |
| `/learn/:slug` 글 중간 | 반응형 배너 | 항상 표시 |
| `/learn/:slug` 글 하단 | 가로 배너 | 항상 표시 |
| 사이드바 하단 | 세로 배너 (160×600) | 데스크톱만 |
| 대시보드·캘린더·뉴스 | 사이드바 하단 배너 1개 | 기능 최소 방해 |

AdSense 스크립트는 `index.html`에 한 번만 삽입.

---

## 6. 범위 외 (이번 구현에서 제외)

- i18n 다국어 글 (한국어 단독으로 시작, 향후 영어 번역 추가)
- 글 검색 기능
- 댓글 시스템
- 뉴스레터 구독
- 크로스 디바이스 동기화와의 연동

---

## 7. 성공 기준

- 글 10편 모두 800단어 이상
- `/learn` 및 개별 글 URL Google 크롤 가능 확인
- AdSense 재신청 후 승인
