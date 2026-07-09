// 사이트 전역 설정 (브라우저·Node 공용 — Vite 전용 API 사용 금지)
// 커스텀 도메인 구입 시 SITE_URL만 변경하면 sitemap/canonical/OG 전체에 반영된다.
export const SITE_URL = 'https://private-stock-history-record.pages.dev'
export const SITE_NAME = 'Ledger'
export const DEFAULT_DESCRIPTION =
  '국내·해외 주식을 한 화면에서 추적하는 프라이버시 우선 포트폴리오 트래커. 실시간 시세, 수익률, 리밸런싱 가이드와 투자 학습 콘텐츠를 제공합니다.'
// 서비스용 이메일이 준비되면 입력 — 값이 있으면 About 페이지에 연락처 섹션이 자동 표시된다.
export const CONTACT_EMAIL = ''

export const PAGE_META = {
  '/': {
    title: 'Ledger — 국내·해외 주식 포트폴리오 트래커',
    description: DEFAULT_DESCRIPTION,
  },
  '/learn': {
    title: '투자 가이드 — Ledger',
    description: '한국·미국 주식 투자 실전 지식 — 세금, 리밸런싱, ETF, 배당, 환율, 연금까지 초보자 눈높이로 정리한 투자 가이드.',
  },
  '/news': {
    title: '시장 뉴스 — Ledger',
    description: '보유 종목과 시장 관련 국내외 뉴스를 감성 분석과 함께 한눈에 확인하세요.',
  },
  '/calendar': {
    title: '투자 캘린더 — Ledger',
    description: '거래 내역과 포트폴리오 이벤트를 달력 형태로 확인하는 투자 기록 캘린더.',
  },
  '/about': {
    title: 'Ledger 소개 — 프라이버시 우선 포트폴리오 트래커',
    description: 'Ledger는 모든 데이터를 사용자의 브라우저에만 저장하는 프라이버시 우선 주식 포트폴리오 트래커입니다. 만든 이유와 데이터 출처를 소개합니다.',
  },
  '/help': {
    title: '도움말 — Ledger 사용법',
    description: 'Ledger 사용법 안내 — 종목 추가, 실시간 시세, 스냅샷, 리밸런싱, 데이터 백업까지 단계별로 설명합니다.',
  },
  '/privacy': {
    title: '개인정보처리방침 — Ledger',
    description: 'Ledger의 데이터 처리 원칙 — 포트폴리오 데이터는 서버로 전송되지 않고 사용자의 브라우저에만 저장됩니다.',
  },
}
