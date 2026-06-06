# NewsPage 데이터 연동 설계

## 개요

보유 종목별 최신 뉴스를 NewsPage에 표시한다. USD 종목은 Finnhub `/company-news`, KRW 종목은 Naver Finance 비공식 스크래핑(Cloudflare Function 프록시)으로 가져온다. 종목별 독립 로딩(섹션별 progressive loading) 방식으로 구현한다.

---

## 데이터 소스

### USD — Finnhub `/company-news`

- 엔드포인트: `GET https://finnhub.io/api/v1/company-news?symbol={ticker}&from={from}&to={to}&token={key}`
- `from`: 오늘 기준 30일 전, `to`: 오늘
- 반환 필드: `headline`, `summary`, `source`, `url`, `datetime` (Unix timestamp)
- 무료 티어, 60회/분 — 보유 종목 수에 관계없이 여유
- 종목당 최대 10개 표시

### KRW — Naver Finance 스크래핑

- 대상 URL: `https://finance.naver.com/item/news_news.nhn?code={6자리코드}&page=1`
- CORS 문제 → Cloudflare Function 프록시(`/naver-news?code={code}`)에서 fetch 후 HTMLRewriter로 파싱
- 추출 항목: 제목, 링크, 출처, 날짜
- 요약(summary)은 Naver 목록 페이지에서 제공되지 않으므로 `null`로 처리
- 스크래핑 실패 또는 Naver HTML 구조 변경 시 → 폴백 처리

---

## 파일 구조

| 파일 | 작업 | 역할 |
|---|---|---|
| `functions/naver-news.js` | 신규 | Cloudflare Function — Naver HTML fetch + HTMLRewriter 파싱 + JSON 반환 |
| `src/utils/naverNews.js` | 신규 | KRW 뉴스 fetch 함수 (CF 프록시 호출) |
| `src/hooks/useStockNews.js` | 신규 | 종목당 뉴스 훅 — currency에 따라 Finnhub/Naver 분기, loading/error/articles 상태 |
| `src/pages/NewsPage.jsx` | 전면 교체 | 종목별 섹션 렌더링, `useStockNews` 연결 |
| `src/utils/finnhub.js` | 수정 | `fetchCompanyNews(ticker, from, to, apiKey)` 추가, 1시간 캐시 |
| `src/index.css` | 수정 | 뉴스 CSS 추가 |

---

## 데이터 흐름

```
NewsPage
  └─ holdings.map(h =>
       useStockNews(h.t, h.currency)
         ├─ USD → fetchCompanyNews() → finnhub.io/api/v1/company-news
         └─ KRW → fetchNaverNews()  → /naver-news?code={h.t}
                                         └─ finance.naver.com HTML
    )
```

---

## 컴포넌트 설계

### `useStockNews(ticker, currency)`

```js
return { articles, loading, error }
```

- `articles`: 뉴스 아이템 배열 (최대 10개)
- `loading`: boolean
- `error`: string | null
- currency `'USD'` → `fetchCompanyNews`, `'KRW'` → `fetchNaverNews`
- 마운트 시 1회 fetch, 언마운트 시 cancelled flag로 중단

### 뉴스 아이템 공통 형태

```js
{
  title: string,       // 기사 제목
  summary: string | null, // 요약 (KRW는 null)
  source: string,      // 출처 (예: "Reuters", "한국경제")
  url: string,         // 기사 링크
  publishedAt: string, // 표시용 문자열 (예: "3시간 전", "2026-06-05")
}
```

### `fetchCompanyNews(ticker, from, to, apiKey)`

- 모듈 레벨 캐시: 키 `{ticker}:{from}:{to}`, TTL 1시간
- Finnhub `datetime` (Unix) → `publishedAt` 변환: 24시간 이내면 "N시간 전", 이상이면 날짜 문자열
- 결과 최대 10개로 슬라이스

### `functions/naver-news.js`

- `GET /naver-news?code={code}` 요청 처리
- Naver URL fetch → HTMLRewriter로 파싱
- 파싱 대상: `table.type5 tr` → `td.title a` (제목+링크), `td.info` (출처), `td.date` (날짜)
- 성공: JSON 배열 반환
- 실패(네트워크 오류, 파싱 결과 없음): `{ error: "..." }` 반환

---

## UI 구조

```
NewsPage
├─ 제목: "뉴스"
└─ 종목 섹션 × N
    ├─ 섹션 헤더: "AAPL — Apple Inc."  [USD 배지]
    ├─ (로딩 중) 스피너
    ├─ (에러) "뉴스를 불러올 수 없습니다"
    └─ 기사 카드 × 최대 10
        ├─ 제목 (외부 링크, 새 탭)
        ├─ 요약 한 줄 (없으면 미표시)
        └─ 출처 · 시간
```

---

## CSS 클래스 (신규)

```
.news-heading          — 페이지 타이틀
.news-section          — 종목 섹션 컨테이너
.news-section-header   — 종목명 헤더
.news-currency-badge   — USD/KRW 배지
.news-card             — 기사 카드
.news-card-title       — 기사 제목 링크
.news-card-summary     — 요약 텍스트
.news-card-meta        — 출처·시간 행
.news-empty            — 뉴스 없음 안내
.news-error            — 에러 안내
```

---

## 캐싱 전략

| 구분 | TTL | 방식 |
|---|---|---|
| Finnhub 뉴스 | 1시간 | 모듈 레벨 캐시 (ticker+날짜 키) |
| Naver 뉴스 | 1시간 | 모듈 레벨 캐시 (ticker 키) |

---

## 폴백 처리

| 상황 | 처리 |
|---|---|
| Finnhub API 키 없음 | articles: [] |
| Finnhub 네트워크 오류 | error 표시, 캐시 있으면 반환 |
| Naver 스크래핑 실패 | error: "뉴스를 불러올 수 없습니다" |
| Naver HTML 구조 변경으로 파싱 결과 없음 | 동일하게 error 처리 |

---

## 범위 외

- 뉴스 검색/필터링
- 페이지네이션 (10개로 고정)
- 뉴스 이미지 표시
- 실시간 갱신 (새로고침 버튼 없음, 캐시 만료 시 자동)
