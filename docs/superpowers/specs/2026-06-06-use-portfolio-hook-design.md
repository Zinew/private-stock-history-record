# Design: `usePortfolio` Hook Extraction

**Date:** 2026-06-06  
**Scope:** Refactoring — no new features

---

## Goal

Extract all business logic from `App.jsx` into a single `usePortfolio` hook. App becomes a thin shell (routing + sidebar UI state only). Props drilling from App to DashboardPage drops from 13 individual props to 1 object.

---

## New File

### `src/hooks/usePortfolio.js`

Internally calls:
- `useLocalStorage` — holdings, snaps, displayCurrency, exchangeRate
- `useExchangeRate(setExchangeRate)`
- `useStockPrices(usdTickers)`
- `useKrxPrices(krwHoldings)`

Returns a single object:

```js
{
  // Raw + derived state
  holdings,             // original holdings array (for EditModal)
  effectiveHoldings,    // holdings with live prices applied
  snaps,
  displayCurrency,      // accounts for missing exchange rate (falls back to 'USD')
  exchangeRate,

  // Portfolio metrics
  totalVal,
  totalCost,
  pl,
  ret,
  toDisplay,            // (amount, fromCurrency) => number

  // Price state
  prices,
  priceLoading,
  priceError,
  lastUpdatedAt,
  onRefresh,            // calls refreshUsd() + refreshKrw()

  // Actions
  addHolding,
  delHolding,
  editHolding,
  toggleCurrency,
  takeSnapshot,
  clearSnaps,
}
```

---

## Changed Files

### `src/App.jsx`

Before: 135 lines — state, hooks, derived values, CRUD, snapshot logic, render  
After: ~30 lines — `usePortfolio()`, sidebarOpen state, JSX only

```jsx
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const portfolio = usePortfolio()

  return (
    <div className="wrap">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header
        totalVal={portfolio.totalVal}
        totalCost={portfolio.totalCost}
        pl={portfolio.pl}
        ret={portfolio.ret}
        displayCurrency={portfolio.displayCurrency}
        onToggleCurrency={portfolio.toggleCurrency}
        exchangeRate={portfolio.exchangeRate}
        onMenuOpen={() => setSidebarOpen(true)}
      />
      <Routes>
        <Route path="/" element={<DashboardPage portfolio={portfolio} />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/news" element={<NewsPage />} />
      </Routes>
    </div>
  )
}
```

### `src/pages/DashboardPage.jsx`

Before: `({ effectiveHoldings, snaps, totalVal, effectiveDisplayCurrency, toDisplay, prices, priceLoading, priceError, lastUpdatedAt, onRefresh, onAdd, onDelete, onEdit, rawHoldings, onSnapshot, onClear })`  
After: `({ portfolio })` — accesses all values via `portfolio.*`

---

## Out of Scope

- No changes to `HoldingsTable`, `Header`, `Charts`, `SnapshotBar`, `Sidebar`, or any hook/util files
- No new tests — existing test suite passing is the success criterion
- ChartJS registration stays in `App.jsx` (it's a side effect, not business logic)

---

## Success Criteria

1. All existing tests pass without modification
2. `App.jsx` shrinks from 135 → ~30 lines
3. `usePortfolio.js` is ~80 lines
4. No observable behavior change in the app
