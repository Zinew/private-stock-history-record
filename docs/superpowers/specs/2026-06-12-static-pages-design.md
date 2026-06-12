# 정적 페이지 재작업 설계

**날짜:** 2026-06-12
**목표:** 소개/개인정보처리방침/도움말 페이지의 레이아웃을 대시보드 디자인 언어(카드 패널, mono 라벨, Fraunces+골드 마침표)에 정합시키고, 문구를 현재 기능 기준으로 재작성한다.

## 배경

정적 페이지 3개가 평범한 문서형 레이아웃으로 메인과 따로 놂. 도움말은 현재 UI와 어긋남("'매도' 탭" → 실제는 매수/매도 토글 + "+ 매도" 버튼) 및 신기능(리밸런싱 가이드, 현금 통화, 목표 비중) 미반영.

## 변경 내용

### 1. 레이아웃 (`src/styles/pages.css` 정적 페이지 영역 재작성 + JSX 3개)

- **페이지 제목**: `.static-page h1` — Fraunces 26px/700 + JSX에서 `<span className="dot">.</span>` 골드 마침표 (`.static-page h1 .dot { color: var(--gold) }`) — `Ledger.` 브랜드 시그니처 에코
- **태그라인**: h1 아래 유지 (`--ink-dim`)
- **섹션 카드**: 신규 `.static-section` — `background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 22px; margin-bottom: 20px` (대시보드 `.holdings`와 동일 메트릭)
- **섹션 제목**: 카드 안 `<h2 className="holdings-title">` 재사용 + `.static-section .holdings-title { margin-bottom: 12px }` 보정 (리밸런싱 카드와 동일 패턴)
- **기능 리스트**: `.static-list` — 기본 불릿 제거, `li::before { content: '– '; color: var(--accent) }`
- **FAQ**: `.static-faq-q::before { content: 'Q '; color: var(--accent); font-family: mono }` — 질문 민트 프리픽스, 답변 `--ink-dim` 유지
- `.static-page` max-width 680·중앙 정렬·패딩 유지. 기존 `.static-page h2/p/ul` 문서형 규칙은 새 구조에 맞게 교체
- JSX: 각 페이지 섹션을 `<section className="static-section">`으로 감싸고 h2 클래스 교체. 컴포넌트 구조·라우팅 무변경

### 2. 문구 재작성 (`src/locales/ko.json`·`en.json`의 about/privacy/help 섹션)

**톤 원칙:** 간결·명료·제품다운. 프라이버시 우선 메시지 유지·강화. 사실관계 보존 — 데이터 출처(Finnhub·Alpha Vantage·Naver Finance), localStorage 전용 저장, 백업 권장, KRX 장중 시세, 기기 간 동기화 추후 예정.

- **about**: 태그라인 다듬기. 기능 리스트 5개를 현재 기능 기준으로 갱신 (실시간 USD+KRW 시세, 평균단가·실현손익 자동 계산, 목표 비중·리밸런싱 가이드, 실적 캘린더·뉴스, 브라우저 전용 저장)
- **privacy**: 의미·구성 유지, 문장 정리. lastUpdated "2026년 6월" 유지
- **help**: 기존 4섹션 + FAQ를 현재 UI 명칭으로 교정 (매수/매도 토글, "+ 매수"/"+ 매도" 버튼, 종목 검색→현재가 자동 입력, 현금 ✎). **신규 섹션 1개 추가**: `portfolioTitle`/`portfolioBody` — 현금 입력(KRW/USD 선택), 종목별 목표 비중(✎), 리밸런싱 가이드 읽는 법
- ko/en 키 집합 미러 유지. 문구 전문은 구현 플랜에 수록

## 검증 기준

1. 기존 테스트 225개 무수정 통과 (정적 페이지·로케일 about/privacy/help 키를 참조하는 테스트 없음 — 플랜에서 grep으로 확인 후 진행)
2. ko/en 키 집합 미러 검증 스크립트 통과
3. `npm run build` 성공
4. 육안: 3개 페이지가 대시보드와 같은 카드 언어, 모바일 폭 정상, 한/영 전환 정상

## 비범위 (YAGNI)

- 404 페이지 변경 없음 (자체 스타일 보유)
- 새 페이지·라우팅·사이드바 변경 없음
- 정적 페이지 테스트 신설 없음
