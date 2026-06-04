import '@testing-library/jest-dom'

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
