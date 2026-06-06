# Design: Inline Styles → CSS Classes

**Date:** 2026-06-06  
**Scope:** Refactoring — no visual changes, no new features

---

## Goal

Replace all `style={{...}}` inline props across 4 components with named CSS classes in `index.css`. Improves readability, enables consistent theming via CSS variables, and eliminates dynamic style props where CSS pseudo-selectors suffice.

---

## Changes to `src/index.css`

Add the following classes (append after existing rules):

### HoldingsTable classes

```css
.holdings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.holdings-title {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink-dim);
  margin: 0;
}

.refresh-btn {
  background: none;
  border: 1px solid var(--ink-dim);
  border-radius: 4px;
  color: var(--ink-dim);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 8px;
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.refresh-time {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 10px;
  color: var(--ink-faint);
}

.price-error {
  background: rgba(232, 101, 79, .12);
  border: 1px solid rgba(232, 101, 79, .3);
  border-radius: 6px;
  color: #e8654f;
  font-size: 12px;
  margin-bottom: 12px;
  padding: 6px 12px;
}

.live-dot {
  color: #3fbf8f;
  font-size: 9px;
  margin-right: 3px;
}
```

### AddHoldingForm classes

```css
.field.nm {
  position: relative;
}

.ticker-error {
  color: #e8654f;
  font-size: 10px;
  display: block;
  margin-top: 2px;
}
```

### EditModal classes

```css
.modal-title {
  font-family: 'Spline Sans Mono', monospace;
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 20px;
}

.auto-label {
  color: var(--ink-faint);
  font-size: 10px;
  margin-left: 6px;
}
```

### Header classes

```css
.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
```

---

## Component Changes

### `src/components/HoldingsTable.jsx`

| Line | Before | After |
|------|--------|-------|
| 25 | `<div style={{ display:'flex', ... }}>` | `<div className="holdings-header">` |
| 26 | `<h2 style={{ fontFamily: ... }}>` | `<h2 className="holdings-title">` |
| 35 | `<button style={{ background:'none', ..., opacity: priceLoading ? 0.5 : 1 }}>` | `<button className="refresh-btn">` |
| 40 | `<span style={{ fontFamily: ... }}>` | `<span className="refresh-time">` |
| 49 | `<div style={{ background:'rgba(232,...', ... }}>` | `<div className="price-error">` |
| 85 | `<span style={{ color:'#3fbf8f', ... }}>` | `<span className="live-dot">` |

### `src/components/AddHoldingForm.jsx`

| Line | Before | After |
|------|--------|-------|
| 120 | `<div className="field nm" style={{ position:'relative' }}>` | `<div className="field nm">` |
| 173 | `<span style={{ color:'#e8654f', ... }}>` | `<span className="ticker-error">` |

### `src/components/EditModal.jsx`

| Line | Before | After |
|------|--------|-------|
| 35 | `<h3 style={{ fontFamily: ... }}>` | `<h3 className="modal-title">` |
| 53 | `<span style={{ color:'var(--ink-faint)', ... }}>` | `<span className="auto-label">` |

### `src/components/Header.jsx`

| Line | Before | After |
|------|--------|-------|
| 21 | `<div style={{ display:'flex', flexDirection:'column', ... }}>` | `<div className="header-right">` |

---

## Out of Scope

- No style value changes — pixel-perfect identical rendering
- No new components, no logic changes
- No new test files — 96 existing tests passing is the success criterion

---

## Success Criteria

1. All 96 existing tests pass without modification
2. Zero `style={{` remaining in the 4 target components
3. No visual change in the app
