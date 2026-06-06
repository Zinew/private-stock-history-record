# Design: Extract `AddHoldingForm` from `HoldingsTable`

**Date:** 2026-06-06  
**Scope:** Refactoring — no new features

---

## Goal

Split `HoldingsTable.jsx` (286 lines, two responsibilities) into two focused components:
- `HoldingsTable.jsx` — table display + edit modal
- `AddHoldingForm.jsx` — add form + stock search typeahead

---

## New File

### `src/components/AddHoldingForm.jsx`

**Props:**
```jsx
<AddHoldingForm
  onAdd={onAdd}   // (holding) => void
/>
```

**Internal state (moved from HoldingsTable):**
- `form` — `{ ticker, name, qty, buy, cur, currency, exchange }`
- `tickerStatus` — `'idle' | 'loading' | 'found' | 'error'`
- `searchResults` — array of search result items
- `searchOpen` — boolean
- `debounceRef` — useRef for debounced search

**Internal handlers (moved from HoldingsTable):**
- `handleTickerBlur` — fetches USD quote on blur
- `handleNameChange` — debounced search typeahead
- `handleSelect` — selects a search result, fetches price
- `handleAdd` — validates and calls `onAdd`, resets form

**Imports (moved from HoldingsTable):**
- `fetchQuote` from `../utils/finnhub.js`
- `fetchUsdSearch`, `fetchKrxSearch`, `fetchKrxQuote` from `../utils/stockSearch.js`

---

## Changed File

### `src/components/HoldingsTable.jsx`

**Removed:**
- `form`, `tickerStatus`, `searchResults`, `searchOpen`, `debounceRef` state
- `handleTickerBlur`, `handleNameChange`, `handleSelect`, `handleAdd` functions
- Imports: `fetchQuote`, `fetchUsdSearch`, `fetchKrxSearch`, `fetchKrxQuote`
- Entire `.addbar` JSX block (~100 lines)

**Added:**
- Import `AddHoldingForm`
- `<AddHoldingForm onAdd={onAdd} />` at the bottom (before EditModal)

**Stays:**
- `editingIndex` state + `EditModal`
- Table rendering (holdings rows, calculations)
- Refresh button + error banner
- `hasAutoHoldings`, `dispSym` derived values

---

## Out of Scope

- No changes to props passed into `HoldingsTable` from `DashboardPage`
- No changes to `EditModal`, `DashboardPage`, or any hook/util files
- No new tests — existing 96-test suite passing is the success criterion

---

## Success Criteria

1. All 96 existing tests pass without modification
2. `HoldingsTable.jsx` shrinks from 286 → ~150 lines
3. `AddHoldingForm.jsx` is ~140 lines
4. No observable behavior change in the app
