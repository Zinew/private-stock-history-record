import '@testing-library/jest-dom'

// Mock localStorage for Node.js environments
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    data: {},
    getItem(key) {
      return this.data[key] || null
    },
    setItem(key, value) {
      this.data[key] = String(value)
    },
    removeItem(key) {
      delete this.data[key]
    },
    clear() {
      this.data = {}
    },
  }
}
