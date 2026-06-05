import '@testing-library/jest-dom'

// Required for React 18 act() support in jsdom test environment
global.IS_REACT_ACT_ENVIRONMENT = true

// Vitest jsdom does not provide localStorage in this version — polyfill it
if (typeof localStorage === 'undefined') {
  let store = {}
  global.localStorage = {
    getItem: key => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: key => { delete store[key] },
    clear: () => { store = {} },
  }
}
