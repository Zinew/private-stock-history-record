# Inline Styles → CSS Classes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `style={{...}}` inline props across 4 components with named CSS classes in `index.css`, with no visual change.

**Architecture:** Append 11 new CSS classes to `src/index.css`, then replace matching inline `style={{}}` props with `className` references in each component. Dynamic `opacity`/`cursor` on the refresh button is handled via CSS `:disabled`. No logic changes anywhere.

**Tech Stack:** CSS, React JSX

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/index.css` | Append 11 new classes |
| Modify | `src/components/HoldingsTable.jsx` | 6 inline styles → classNames |
| Modify | `src/components/AddHoldingForm.jsx` | 2 inline styles → className / removed |
| Modify | `src/components/EditModal.jsx` | 2 inline styles → classNames |
| Modify | `src/components/Header.jsx` | 1 inline style → className |

---

### Task 1: Establish baseline

**Files:** run test suite only

- [ ] **Step 1: Run tests**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)` across 11 files.

---

### Task 2: Add CSS classes to `index.css`

**Files:**
- Modify: `src/index.css` (append to end of file)

- [ ] **Step 1: Append new classes to the end of `src/index.css`**

Add this block at the very end of the file:

```css
/* ── Component classes (extracted from inline styles) ── */

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

.field.nm {
  position: relative;
}

.ticker-error {
  color: #e8654f;
  font-size: 10px;
  display: block;
  margin-top: 2px;
}

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

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
```

- [ ] **Step 2: Run tests — expect 96 passing**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`. CSS changes don't affect tests.

---

### Task 3: Update `HoldingsTable.jsx`

**Files:**
- Modify: `src/components/HoldingsTable.jsx`

Make these 6 targeted edits:

- [ ] **Step 1: Replace holdings header div**

Find:
```jsx
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
```
Replace with:
```jsx
      <div className="holdings-header">
```

- [ ] **Step 2: Replace holdings title h2**

Find:
```jsx
        <h2 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-dim)', margin: 0 }}>
```
Replace with:
```jsx
        <h2 className="holdings-title">
```

- [ ] **Step 3: Replace refresh button (remove entire style prop — :disabled CSS handles opacity/cursor)**

Find:
```jsx
              style={{ background: 'none', border: '1px solid var(--ink-dim)', borderRadius: 4, color: 'var(--ink-dim)', cursor: priceLoading ? 'default' : 'pointer', fontSize: 12, padding: '2px 8px', opacity: priceLoading ? 0.5 : 1 }}
```
Replace with:
```jsx
              className="refresh-btn"
```

- [ ] **Step 4: Replace refresh time span**

Find:
```jsx
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: 'var(--ink-faint)' }}>
```
Replace with:
```jsx
              <span className="refresh-time">
```

- [ ] **Step 5: Replace price error banner**

Find:
```jsx
        <div style={{ background: 'rgba(232,101,79,.12)', border: '1px solid rgba(232,101,79,.3)', borderRadius: 6, color: '#e8654f', fontSize: 12, marginBottom: 12, padding: '6px 12px' }}>
```
Replace with:
```jsx
        <div className="price-error">
```

- [ ] **Step 6: Replace live dot span**

Find:
```jsx
                      {isLive && <span style={{ color: '#3fbf8f', fontSize: 9, marginRight: 3 }}>●</span>}
```
Replace with:
```jsx
                      {isLive && <span className="live-dot">●</span>}
```

- [ ] **Step 7: Run tests — expect 96 passing**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`.

---

### Task 4: Update `AddHoldingForm.jsx`

**Files:**
- Modify: `src/components/AddHoldingForm.jsx`

- [ ] **Step 1: Remove inline style from `.field.nm` div**

Find:
```jsx
      <div className="field nm" style={{ position: 'relative' }}>
```
Replace with:
```jsx
      <div className="field nm">
```

- [ ] **Step 2: Replace ticker error span**

Find:
```jsx
          <span style={{ color: '#e8654f', fontSize: 10, display: 'block', marginTop: 2 }}>
```
Replace with:
```jsx
          <span className="ticker-error">
```

- [ ] **Step 3: Run tests — expect 96 passing**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`.

---

### Task 5: Update `EditModal.jsx` and `Header.jsx`

**Files:**
- Modify: `src/components/EditModal.jsx`
- Modify: `src/components/Header.jsx`

- [ ] **Step 1: Replace modal title h3 in `EditModal.jsx`**

Find:
```jsx
        <h3 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 13, letterSpacing: 1, marginBottom: 20 }}>
```
Replace with:
```jsx
        <h3 className="modal-title">
```

- [ ] **Step 2: Replace auto-label span in `EditModal.jsx`**

Find:
```jsx
            {!isKRW && <span style={{ color: 'var(--ink-faint)', fontSize: 10, marginLeft: 6 }}>API 자동</span>}
```
Replace with:
```jsx
            {!isKRW && <span className="auto-label">API 자동</span>}
```

- [ ] **Step 3: Replace header-right div in `Header.jsx`**

Find:
```jsx
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
```
Replace with:
```jsx
      <div className="header-right">
```

- [ ] **Step 4: Run tests — expect 96 passing**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`.

---

### Task 6: Final verification and commit

**Files:**
- Verify: all 4 component files

- [ ] **Step 1: Confirm zero inline styles remain in target files**

```bash
grep -c "style={{" src/components/HoldingsTable.jsx src/components/AddHoldingForm.jsx src/components/EditModal.jsx src/components/Header.jsx
```

Expected: all files show `0`.

- [ ] **Step 2: Run full test suite**

```bash
npm test -- --run
```

Expected: `Tests  96 passed (96)`.

- [ ] **Step 3: Commit**

```bash
git add src/index.css src/components/HoldingsTable.jsx src/components/AddHoldingForm.jsx src/components/EditModal.jsx src/components/Header.jsx
git commit -m "refactor: replace inline styles with CSS classes"
```
