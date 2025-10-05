import { vi } from 'vitest'

export const createLocalStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
}

// Setup global localStorage mock
export const setupLocalStorageMock = () => {
  const localStorageMock = createLocalStorageMock()
  global.localStorage = localStorageMock as Storage
  return localStorageMock
}
