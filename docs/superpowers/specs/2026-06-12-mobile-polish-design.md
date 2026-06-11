# 모바일 디자인 수정 4건 + 뉴스 필터 설계

**날짜:** 2026-06-12
**목표:** 모바일 뷰 결함 4건(매도 select 오버플로, date 잘림, 거래이력 카드 배치, 펼침 토글 모양)을 수정하고, 미국 뉴스에서 SeekingAlpha(로그인 장벽) 기사를 제외한다.

## 배경

- 모바일(640px 이하)에 addbar 규칙이 전혀 없어 데스크톱 고정폭이 그대로 적용됨 — `.field select { min-width: 170px }`(매도 종목)가 화면을 벗어나고, `input[type="date"] { width: 130px }`가 일(日)을 잘라먹음
- 거래이력 모바일 카드는 뱃지가 블록으로 위에 얹히고 하단에 수정 버튼 행이 따로 있어 어수선 — 사용자 제안대로 캘린더 이벤트 카드(가로 1행: 뱃지|정보|우측)와 통일
- 보유종목 카드 펼침 토글이 텍스트 글리프 `∨`/`∧`(논리 연산자 문자)라 폰트 따라 모양이 어색
- Finnhub 뉴스에 SeekingAlpha 출처 기사가 섞여 있는데 클릭 시 로그인 요구. 대안 조사 결과(Yahoo RSS는 구현 규모, NewsAPI는 프로덕션 유료, Alpha Vantage 25/일, Marketaux 100/일) **Finnhub 유지 + 출처 필터**가 최적

## 변경 내용

### 1. 모바일 addbar 풀폭 스택 (`src/styles/mobile.css`)

640px 미디어쿼리 블록에 추가:

```css
  .addbar .field { flex: 1 1 100%; width: 100% }
  .addbar .field input, .addbar .field select { width: 100% }
  .addbar .btn { width: 100% }
```

- mobile.css가 마지막 import이므로 데스크톱 개별 폭 규칙(`.field.nm input { width: 150px }`, `.field input[type="date"] { width: 130px }`, `.field select { min-width: 170px }` 등 동일 특이도)을 순서로 이김
- `min-width: 170px`는 풀폭 컨테이너(>170px)에서 무해
- 타입 토글(`.addbar .currency-toggle`)은 인라인 유지 (폭 변경 없음)
- 데스크톱(>640px) 무영향

### 2. 거래이력 모바일 카드 → 캘린더 카드 스타일

**`src/components/TransactionHistory.jsx`** 모바일 분기(`.tx-mobile-list` 내부)를 가로 1행 구조로 재작성:

```jsx
<div className="tx-card" key={tx.id}>
  <span className={`tx-card-badge ${tx.type}`}>{t(`tx.${tx.type}`)}</span>
  <div className="tx-card-info">
    <div>
      <span className="tx-card-ticker">{tx.ticker}</span>
      {tx.name && tx.name !== tx.ticker && <span className="tx-card-name">{tx.name}</span>}
    </div>
    <div className="tx-card-detail">
      {tx.date ?? t('tx.unknownDate')} · {tx.qty.toLocaleString()} {t('tx.qty')} · {fmtCurrency(tx.price, tx.currency)}
    </div>
  </div>
  <div className="tx-card-right">
    <div className="tx-card-amount">{fmtCurrency(tx.qty * tx.price, tx.currency)}</div>
    <button className="edit" onClick={() => setEditingTx(tx)} title={t('tx.edit')}>✎</button>
  </div>
</div>
```

(데스크톱 테이블 분기·정렬·모달 로직 무변경. 삭제 버튼은 현행대로 모바일 미노출)

**`src/styles/mobile.css`** tx-card 규칙 재작성 — 캘린더 카드 메트릭과 통일:

- `.tx-card`를 공유 규칙(`.holding-card, .tx-card`)에서 분리: `display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 6px; margin-bottom: 6px` (배경 없음 — 캘린더 카드와 동일)
- `.tx-card-badge`: 캘린더 뱃지 타이포로 — `font-family: 'Spline Sans Mono'; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; margin-top: 2px`. buy/sell 색 유지
- `.tx-card-info { flex: 1; min-width: 0 }`, `.tx-card-ticker`(12px mono, var(--ink)), `.tx-card-name`(11px, var(--ink-dim), margin-left 6px), `.tx-card-detail`(11px, var(--ink-faint), margin-top 3px)
- `.tx-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0 }`, `.tx-card-amount`(13px, 600, var(--ink))
- 불용 규칙 삭제: `.tx-card-header`, `.tx-card-sub`, `.tx-card-actions`의 tx 전용 부분 (`.holding-card-actions, .tx-card-actions` 공유 규칙이면 holding 쪽만 남김)
- 기존 테스트가 참조하는 클래스(`.tx-mobile-list`, `.tx-card`, `.tx-card-badge.buy/.sell`, `.edit`)는 전부 유지 → TransactionHistory.test.jsx 무수정 통과

### 3. 펼침 토글 CSS 셰브론

**`src/components/HoldingsMobileList.jsx`**: 토글 버튼의 글리프 텍스트(`{expandedCards[h.t] ? '∧' : '∨'}`)를 `<span className="chevron" />`로 교체하고, 버튼 className에 expanded 토글:

```jsx
<button
  className={`mobile-card-toggle${expandedCards[h.t] ? ' expanded' : ''}`}
  onClick={() => toggleCard(h.t)}
  title={expandedCards[h.t] ? t('common.collapse') : t('common.expand')}
>
  <span className="chevron" />
</button>
```

**`src/styles/mobile.css`** `.mobile-card-toggle` 규칙 근처에 추가:

```css
.mobile-card-toggle .chevron {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform .15s;
  margin-top: -2px;
}
.mobile-card-toggle.expanded .chevron {
  transform: rotate(225deg);
  margin-top: 2px;
}
```

기존 토글 테스트는 `getByTitle('펼치기')`/`getByTitle('접기')` 조회 → 무수정 통과.

### 4. 뉴스 SeekingAlpha 필터 (`functions/api/company-news.js`)

Finnhub 응답을 slice 전에 필터:

```js
const filtered = Array.isArray(data)
  ? data.filter(item => !/seeking ?alpha/i.test(item.source || ''))
  : []
const result = filtered.slice(0, 10).map(item => ({ ... 기존 매핑 ... }))
```

- KV 캐시(1시간 TTL)의 기존 결과는 만료 후 자연 갱신
- Cloudflare Functions라 **로컬 검증 불가** — 배포 후 뉴스 페이지에서 확인

## 검증 기준

1. `npm test` 221개 **무수정** 통과 (toggle은 title 조회, tx 테스트는 유지 클래스만 참조)
2. `npm run build` 성공
3. dev 서버 모바일 폭(640px 이하) 육안: ① addbar 필드 풀폭 스택, 매도 select·date 정상 ② 거래이력 카드가 캘린더 카드와 같은 형태 ③ 셰브론 토글 모양·회전 ④ 데스크톱 무변화
4. 배포 후: 미국 종목 뉴스에 SeekingAlpha 출처 부재

## 비범위 (YAGNI)

- 뉴스 보충 소스(Yahoo RSS 등) 추가 없음
- 거래이력 모바일 카드에 삭제 버튼 추가 없음 (현행 유지)
- 데스크톱 레이아웃·캘린더 페이지 변경 없음
