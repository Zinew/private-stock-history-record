# Mobile Card View Design Spec

## Overview

Optimize the dashboard for mobile screens by replacing wide tables with card-based layouts. Desktop view is unchanged. Only the Dashboard page (HoldingsTable + TransactionHistory) is in scope.

## Breakpoint

- `640px` and below: card view active
- Existing `840px` breakpoint (grid single-column) is preserved and unchanged

## Implementation Strategy

CSS media query toggle: keep the existing `<table>` in DOM, add mobile card markup in the same component, use `display:none/block` to switch between them at 640px. No JS logic changes needed — the same props/data feed both views.

## HoldingsTable — Mobile Card

### What changes
- `<table>` hidden on mobile (`display:none` at ≤640px)
- New `.holdings-mobile-list` container shown on mobile

### Card layout (per holding)

```
┌─────────────────────────────────┐
│ 종목명  [KOSPI]          ₩780k  │
│ 005930 · 10주          ▲ 3.24% │
├─────────────────────────────────┤
│  현재가       매수가      비중   │
│  ₩78,000     ₩72,000   28.4%  │
└─────────────────────────────── [✎] │
```

**Top row (left):** `name` + market badge (KOSPI / KOSDAQ / US)  
**Top row (right):** evaluated value (`currentPrice × qty`)  
**Second row (left):** `ticker · qty shares`  
**Second row (right):** change % with ▲/▼ and color  
**Divider**  
**Stats row:** 3-column grid — 현재가 / 매수가 / 비중  
**Edit button (✎):** bottom-right of card, triggers existing `onEdit` handler

### Color rules (same as desktop)
- Positive return: `#4caf50` (green), ▲
- Negative return: `#f44336` (red), ▼

## TransactionHistory — Mobile Card

### What changes
- `<table>` hidden on mobile
- New `.tx-mobile-list` container shown on mobile

### Card layout (per transaction)

```
┌─────────────────────────────────┐
│ [매수]                          │
│ 삼성전자               ₩720,000 │
│ 2026-05-12 · 10주 · ₩72,000   │
└────────────────────────────[✎] │
```

**Buy/sell badge:** `매수` green / `매도` red (matches existing table colors)  
**Name:** stock name  
**Amount (right):** `qty × price` total  
**Sub-row:** date · qty · unit price  
**Edit button (✎):** bottom-right, triggers existing edit handler

## Body Padding

```css
@media (max-width: 640px) {
  body {
    padding: 16px 12px 80px;
  }
}
```

Current: `32px 24px 80px`. Bottom padding (80px) preserved for bottom nav clearance.

## CSS Classes

New classes added to `src/index.css`:

| Class | Purpose |
|---|---|
| `.holdings-mobile-list` | Container for holdings cards on mobile |
| `.holding-card` | Individual holding card |
| `.holding-card-header` | Top row (name+badge / value+change) |
| `.holding-card-stats` | 3-column stats grid row |
| `.tx-mobile-list` | Container for transaction cards on mobile |
| `.tx-card` | Individual transaction card |
| `.tx-card-header` | Top row (name / amount) |

## Files Modified

- `src/components/HoldingsTable.jsx` — add `.holdings-mobile-list` card markup
- `src/components/TransactionHistory.jsx` — add `.tx-mobile-list` card markup
- `src/index.css` — add mobile card styles + body padding override

## Files NOT Modified

- `src/pages/DashboardPage.jsx` — no changes needed
- `functions/` — no API changes
- Any non-dashboard page

## Out of Scope

- Calendar page
- News page
- About/Help/Privacy pages
- Chart components (already responsive)
- Header (already fixed in previous session)

## Testing Criteria

1. At viewport ≤640px: table hidden, cards visible
2. At viewport >640px: cards hidden, table visible
3. Edit button on each card triggers correct edit modal
4. Buy/sell colors correct on transaction cards
5. ▲/▼ and color correct on holdings cards
6. No layout breakage at exactly 640px and 641px
