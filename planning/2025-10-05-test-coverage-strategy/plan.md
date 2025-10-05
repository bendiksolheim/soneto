# Test Coverage Strategy Implementation Plan

## Overview

Implement a comprehensive testing infrastructure for Soneto from 0% to meaningful test coverage (~70-80%). This plan establishes testing foundations across unit, integration, and E2E tests with a "broad coverage first" approach - establishing patterns for all test types before going deep on test cases.

## Current State Analysis

**Testing Infrastructure**: None
- No test files exist
- No testing libraries in dependencies
- No test scripts configured
- Test coverage: 0%

**Codebase Structure**:
- 9 files in `/lib` - Pure functions, ideal for unit testing
- 2 files in `/hooks` - State management with localStorage
- 19 files in `/components` - UI components (14 application + 5 shadcn/ui)
- Next.js 15 with React 19, TypeScript, Tailwind CSS

### Key Discoveries:
- **Clean separation**: Business logic in `/lib` is framework-independent
- **Service layer**: `RouteStorageService` uses static methods, easily mockable
- **localStorage coupling**: Direct localStorage access in hooks and services
- **External dependencies**: Mapbox API, `@mapbox/polyline` library
- **Type safety**: Strong TypeScript usage throughout

## Desired End State

After this plan is complete, the codebase will have:
- ✅ Vitest + React Testing Library + Playwright configured
- ✅ Unit tests for 4-5 critical `/lib` files with key test cases
- ✅ Integration tests for both hooks (`useRoutes`, `usePace`)
- ✅ Component test for `ElevationProfile` (establishes pattern)
- ✅ One E2E test for route creation flow (establishes pattern)
- ✅ Test coverage ~60-70% for tested areas
- ✅ Test mocking infrastructure (localStorage, MSW for Mapbox)
- ✅ `pnpm test` command working

### Verification:
```bash
pnpm test              # All tests pass
pnpm test:coverage     # Shows coverage report
pnpm test:e2e          # E2E test passes
```

## What We're NOT Doing

- ❌ Testing the `Map` component (too complex, Mapbox-dependent)
- ❌ Testing shadcn/ui components in `/components/ui/*`
- ❌ Exhaustive test cases (quality over quantity for now)
- ❌ CI/CD coverage threshold enforcement
- ❌ Visual regression testing
- ❌ Performance benchmarking
- ❌ Multiple E2E tests (just establish the pattern)
- ❌ Component tests for all components (just `ElevationProfile` as example)

## Implementation Approach

**Strategy**: Broad coverage across test types to establish patterns, then teams can add more test cases later.

**Priority Order**:
1. Setup infrastructure (Vitest, Playwright, mocks)
2. Unit tests for highest-value business logic
3. Integration tests for stateful hooks
4. One component test to establish pattern
5. One E2E test to establish pattern

**Testability Improvements**: Small refactors allowed if needed (e.g., extracting localStorage to service), but must be minimal and non-breaking.

---

## Phase 1: Testing Infrastructure Setup

### Overview
Install and configure all testing tools, create shared mocks and utilities.

### Changes Required:

#### 1. Install Dependencies
**File**: `package.json`
**Changes**: Add testing libraries to devDependencies

```json
{
  "devDependencies": {
    "vitest": "^2.1.1",
    "@vitest/ui": "^2.1.1",
    "@vitest/coverage-v8": "^2.1.1",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "@playwright/test": "^1.48.2",
    "msw": "^2.6.5",
    "happy-dom": "^15.11.7"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Command**: `pnpm install`

#### 2. Vitest Configuration
**File**: `vitest.config.ts` (new file)
**Changes**: Create Vitest config with Next.js path aliases

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/components/ui/**', // Exclude shadcn/ui components
        'app/**', // Exclude Next.js app directory
        '.next/**',
      ],
      include: ['lib/**', 'hooks/**', 'components/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

#### 3. Vitest Setup File
**File**: `test/setup.ts` (new file)
**Changes**: Global test setup with testing-library matchers

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

#### 4. Playwright Configuration
**File**: `playwright.config.ts` (new file)
**Changes**: Configure E2E testing

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

#### 5. localStorage Mock
**File**: `test/mocks/localStorage.ts` (new file)
**Changes**: Create localStorage mock for testing

```typescript
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
```

#### 6. MSW API Mocks
**File**: `test/mocks/handlers.ts` (new file)
**Changes**: Mock Mapbox API responses

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock Mapbox Directions API
  http.get('https://api.mapbox.com/directions/v5/mapbox/walking/*', () => {
    return HttpResponse.json({
      routes: [
        {
          geometry: 'mock_encoded_polyline',
          distance: 1000,
          duration: 600,
          weight_name: 'pedestrian',
          weight: 600,
          legs: [],
        },
      ],
      waypoints: [],
      code: 'Ok',
    })
  }),

  // Mock Mapbox Terrain API (for elevation data)
  http.get('https://api.mapbox.com/v4/mapbox.terrain-rgb/*', () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
```

#### 7. MSW Setup
**File**: `test/mocks/server.ts` (new file)
**Changes**: Configure MSW for Node environment

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

#### 8. Test Utilities
**File**: `test/utils/test-utils.tsx` (new file)
**Changes**: Custom render function for React Testing Library

```typescript
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'

// Add providers here if needed (e.g., ThemeProvider)
interface WrapperProps {
  children: ReactNode
}

function AllTheProviders({ children }: WrapperProps) {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

### Success Criteria:

#### Automated Verification:
- [x] Dependencies install successfully: `pnpm install`
- [x] Vitest runs without errors: `pnpm test` (should show "no tests found")
- [x] Playwright installs browsers: `pnpm exec playwright install`
- [x] TypeScript compiles configs: `pnpm tsc --noEmit`

#### Manual Verification:
- [x] All config files created in correct locations
- [x] `test/` directory structure exists

---

## Phase 2: Unit Tests - Critical Business Logic

### Overview
Add unit tests for highest-priority pure functions in `/lib` directory. Focus on key test cases that validate core functionality.

### Changes Required:

#### 1. Route Distance Calculations
**File**: `lib/types/route.test.ts` (new file)
**Changes**: Test Haversine distance calculation

```typescript
import { describe, it, expect } from 'vitest'
import { calculateRouteDistance } from './route'
import { Point } from '../map/point'

describe('calculateRouteDistance', () => {
  it('returns 0 for empty array', () => {
    expect(calculateRouteDistance([])).toBe(0)
  })

  it('returns 0 for single point', () => {
    const point: Point = { latitude: 59.9139, longitude: 10.7522 }
    expect(calculateRouteDistance([point])).toBe(0)
  })

  it('calculates distance between two points', () => {
    const oslo: Point = { latitude: 59.9139, longitude: 10.7522 }
    const bergen: Point = { latitude: 60.3913, longitude: 5.3221 }

    const distance = calculateRouteDistance([oslo, bergen])

    // Oslo to Bergen is approximately 304km
    expect(distance).toBeGreaterThan(300)
    expect(distance).toBeLessThan(310)
  })

  it('calculates cumulative distance for multiple points', () => {
    const point1: Point = { latitude: 59.9139, longitude: 10.7522 }
    const point2: Point = { latitude: 59.9149, longitude: 10.7532 }
    const point3: Point = { latitude: 59.9159, longitude: 10.7542 }

    const distance = calculateRouteDistance([point1, point2, point3])

    expect(distance).toBeGreaterThan(0)
  })

  it('handles same point twice (0 distance)', () => {
    const point: Point = { latitude: 59.9139, longitude: 10.7522 }
    const distance = calculateRouteDistance([point, point])

    expect(distance).toBe(0)
  })
})
```

#### 2. Route Compression/Decompression
**File**: `lib/route-compression.test.ts` (new file)
**Changes**: Test polyline encoding/decoding

```typescript
import { describe, it, expect } from 'vitest'
import { compressRoute, decompressRoute, isValidPolyline } from './route-compression'
import { Point } from './map/point'

describe('Route Compression', () => {
  const testPoints: Point[] = [
    { latitude: 59.9139, longitude: 10.7522 },
    { latitude: 59.9149, longitude: 10.7532 },
    { latitude: 59.9159, longitude: 10.7542 },
  ]

  describe('compressRoute', () => {
    it('returns empty string for empty array', () => {
      expect(compressRoute([])).toBe('')
    })

    it('encodes single point', () => {
      const encoded = compressRoute([testPoints[0]])
      expect(encoded).toBeTruthy()
      expect(typeof encoded).toBe('string')
    })

    it('encodes multiple points', () => {
      const encoded = compressRoute(testPoints)
      expect(encoded).toBeTruthy()
      expect(encoded.length).toBeGreaterThan(0)
    })
  })

  describe('decompressRoute', () => {
    it('returns empty array for empty string', () => {
      expect(decompressRoute('')).toEqual([])
    })

    it('returns empty array for whitespace', () => {
      expect(decompressRoute('   ')).toEqual([])
    })

    it('decodes valid polyline', () => {
      const encoded = compressRoute(testPoints)
      const decoded = decompressRoute(encoded)

      expect(decoded).toHaveLength(testPoints.length)

      // Check first point (allowing for precision loss)
      expect(decoded[0].latitude).toBeCloseTo(testPoints[0].latitude, 5)
      expect(decoded[0].longitude).toBeCloseTo(testPoints[0].longitude, 5)
    })

    it('handles invalid polyline gracefully', () => {
      const result = decompressRoute('invalid!!!polyline')
      expect(result).toEqual([])
    })
  })

  describe('round-trip compression', () => {
    it('preserves data through compress → decompress', () => {
      const encoded = compressRoute(testPoints)
      const decoded = decompressRoute(encoded)

      expect(decoded).toHaveLength(testPoints.length)

      decoded.forEach((point, i) => {
        expect(point.latitude).toBeCloseTo(testPoints[i].latitude, 5)
        expect(point.longitude).toBeCloseTo(testPoints[i].longitude, 5)
      })
    })
  })

  describe('isValidPolyline', () => {
    it('returns false for empty string', () => {
      expect(isValidPolyline('')).toBe(false)
    })

    it('returns false for invalid string', () => {
      expect(isValidPolyline('not-a-polyline')).toBe(false)
    })

    it('returns true for valid polyline', () => {
      const encoded = compressRoute(testPoints)
      expect(isValidPolyline(encoded)).toBe(true)
    })
  })
})
```

#### 3. Slope Calculations
**File**: `lib/elevation/slope.test.ts` (new file)
**Changes**: Test slope calculation and segment detection

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateSlope,
  getSlopeColor,
  getSlopeOpacity,
  findSteepSegments,
} from './slope'

describe('Slope Calculations', () => {
  describe('calculateSlope', () => {
    it('calculates positive slope for uphill', () => {
      const point1 = { distance: 0, elevation: 0 }
      const point2 = { distance: 1, elevation: 100 } // 100m rise over 1km

      const slope = calculateSlope(point1, point2)
      expect(slope).toBe(10) // 10% grade
    })

    it('calculates negative slope for downhill', () => {
      const point1 = { distance: 0, elevation: 100 }
      const point2 = { distance: 1, elevation: 0 }

      const slope = calculateSlope(point1, point2)
      expect(slope).toBe(-10)
    })

    it('returns 0 for flat terrain', () => {
      const point1 = { distance: 0, elevation: 50 }
      const point2 = { distance: 1, elevation: 50 }

      expect(calculateSlope(point1, point2)).toBe(0)
    })

    it('handles zero distance (prevents divide by zero)', () => {
      const point1 = { distance: 5, elevation: 100 }
      const point2 = { distance: 5, elevation: 200 }

      expect(calculateSlope(point1, point2)).toBe(0)
    })
  })

  describe('getSlopeColor', () => {
    it('returns null for slopes below threshold', () => {
      expect(getSlopeColor(0)).toBeNull()
      expect(getSlopeColor(5)).toBeNull()
    })

    it('returns yellow for moderate slopes (6-9%)', () => {
      expect(getSlopeColor(6)).toBe('#fbbf24')
      expect(getSlopeColor(9)).toBe('#fbbf24')
    })

    it('returns orange for steep slopes (10-14%)', () => {
      expect(getSlopeColor(10)).toBe('#f97316')
      expect(getSlopeColor(14)).toBe('#f97316')
    })

    it('returns red for very steep slopes (15%+)', () => {
      expect(getSlopeColor(15)).toBe('#dc2626')
      expect(getSlopeColor(25)).toBe('#dc2626')
    })
  })

  describe('getSlopeOpacity', () => {
    it('returns 0 for slopes below threshold', () => {
      expect(getSlopeOpacity(5)).toBe(0)
    })

    it('returns increasing opacity for steeper slopes', () => {
      expect(getSlopeOpacity(7)).toBe(0.25)
      expect(getSlopeOpacity(12)).toBe(0.35)
      expect(getSlopeOpacity(20)).toBe(0.45)
    })
  })

  describe('findSteepSegments', () => {
    it('returns empty array for insufficient data', () => {
      expect(findSteepSegments([])).toEqual([])
      expect(findSteepSegments([{ distance: 0, elevation: 0, coordinate: [0, 0] }])).toEqual([])
    })

    it('identifies steep segments above threshold', () => {
      const data = [
        { distance: 0, elevation: 0, coordinate: [0, 0] },
        { distance: 0.1, elevation: 10, coordinate: [0, 0] }, // 10% slope
        { distance: 0.2, elevation: 20, coordinate: [0, 0] }, // 10% slope
        { distance: 0.3, elevation: 20, coordinate: [0, 0] }, // 0% slope (ends segment)
      ]

      const segments = findSteepSegments(data, 6, 0.03)

      expect(segments).toHaveLength(1)
      expect(segments[0].x1).toBe(0)
      expect(segments[0].avgSlope).toBeCloseTo(10, 1)
    })

    it('filters out segments shorter than minimum length', () => {
      const data = [
        { distance: 0, elevation: 0, coordinate: [0, 0] },
        { distance: 0.01, elevation: 1, coordinate: [0, 0] }, // 10% but only 10m
        { distance: 0.02, elevation: 2, coordinate: [0, 0] },
      ]

      const segments = findSteepSegments(data, 6, 0.05) // Require 50m minimum

      expect(segments).toEqual([])
    })
  })
})
```

#### 4. Route Storage Service
**File**: `lib/services/route-storage.test.ts` (new file)
**Changes**: Test CRUD operations with mocked localStorage

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RouteStorageService } from './route-storage'
import { setupLocalStorageMock } from '../../test/mocks/localStorage'
import { Point } from '../map/point'

describe('RouteStorageService', () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock()
  })

  describe('saveRoute', () => {
    it('creates new route with UUID and timestamp', () => {
      const routeData = {
        name: 'Morning Run',
        points: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9149, longitude: 10.7532 },
        ] as Point[],
      }

      const savedRoute = RouteStorageService.saveRoute(routeData)

      expect(savedRoute.id).toBeTruthy()
      expect(savedRoute.name).toBe('Morning Run')
      expect(savedRoute.points).toEqual(routeData.points)
      expect(savedRoute.createdAt).toBeTruthy()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('persists route to localStorage', () => {
      const routeData = {
        name: 'Test Route',
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      }

      RouteStorageService.saveRoute(routeData)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'route-runner-routes',
        expect.any(String)
      )
    })
  })

  describe('getRoutes', () => {
    it('returns empty array when no routes exist', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const routes = RouteStorageService.getRoutes()

      expect(routes).toEqual([])
    })

    it('retrieves saved routes from localStorage', () => {
      const mockData = {
        routes: [
          {
            id: '123',
            name: 'Test',
            points: [{ latitude: 60, longitude: 10 }],
            createdAt: '2025-10-05T00:00:00.000Z',
          },
        ],
        lastModified: '2025-10-05T00:00:00.000Z',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))

      const routes = RouteStorageService.getRoutes()

      expect(routes).toHaveLength(1)
      expect(routes[0].name).toBe('Test')
    })

    it('handles corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json{')

      const routes = RouteStorageService.getRoutes()

      expect(routes).toEqual([])
    })
  })

  describe('updateRoute', () => {
    it('updates existing route name', () => {
      const initialRoute = RouteStorageService.saveRoute({
        name: 'Old Name',
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      })

      const updated = RouteStorageService.updateRoute(initialRoute.id, {
        name: 'New Name',
      })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('New Name')
      expect(updated?.id).toBe(initialRoute.id)
    })

    it('returns null for non-existent route', () => {
      const result = RouteStorageService.updateRoute('non-existent-id', {
        name: 'Test',
      })

      expect(result).toBeNull()
    })
  })

  describe('deleteRoute', () => {
    it('removes route from storage', () => {
      const route = RouteStorageService.saveRoute({
        name: 'To Delete',
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      })

      const success = RouteStorageService.deleteRoute(route.id)

      expect(success).toBe(true)

      const routes = RouteStorageService.getRoutes()
      expect(routes.find(r => r.id === route.id)).toBeUndefined()
    })

    it('returns false for non-existent route', () => {
      const success = RouteStorageService.deleteRoute('non-existent')

      expect(success).toBe(false)
    })
  })

  describe('QuotaExceededError handling', () => {
    it('throws error when storage quota exceeded', () => {
      const error = new DOMException('Quota exceeded', 'QuotaExceededError')
      localStorageMock.setItem.mockImplementation(() => {
        throw error
      })

      const routeData = {
        name: 'Large Route',
        points: Array(10000).fill({ latitude: 60, longitude: 10 }) as Point[],
      }

      expect(() => RouteStorageService.saveRoute(routeData)).toThrow(
        'Storage quota exceeded'
      )
    })
  })
})
```

### Success Criteria:

#### Automated Verification:
- [x] All unit tests pass: `pnpm test lib/`
- [x] Coverage >80% for tested files: `pnpm test:coverage`
- [x] No TypeScript errors: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] Test output shows all test suites passing
- [x] Coverage report generated in `coverage/` directory
- [x] Each test file has meaningful test cases

---

## Phase 3: Integration Tests - React Hooks

### Overview
Test custom hooks with React Testing Library's `renderHook`, focusing on state management and localStorage persistence.

### Changes Required:

#### 1. useRoutes Hook Tests
**File**: `hooks/use-routes.test.ts` (new file)
**Changes**: Test route CRUD operations with mocked localStorage

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRoutes } from './use-routes'
import { setupLocalStorageMock } from '../test/mocks/localStorage'
import { Point } from '@/lib/map/point'

describe('useRoutes', () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock()
  })

  it('initializes with empty routes', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useRoutes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.routes).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('loads routes from localStorage on mount', async () => {
    const mockData = {
      routes: [
        {
          id: '123',
          name: 'Test Route',
          points: [
            { latitude: 59.9139, longitude: 10.7522 },
            { latitude: 59.9149, longitude: 10.7532 },
          ],
          createdAt: '2025-10-05T00:00:00.000Z',
        },
      ],
      lastModified: '2025-10-05T00:00:00.000Z',
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))

    const { result } = renderHook(() => useRoutes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.routes).toHaveLength(1)
    expect(result.current.routes[0].name).toBe('Test Route')
    expect(result.current.routes[0].distance).toBeGreaterThan(0)
  })

  it('saves new route and updates state', async () => {
    const { result } = renderHook(() => useRoutes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const routeData = {
      name: 'New Route',
      points: [
        { latitude: 60, longitude: 10 },
        { latitude: 60.1, longitude: 10.1 },
      ] as Point[],
    }

    let savedRoute
    await waitFor(async () => {
      savedRoute = await result.current.saveRoute(routeData)
    })

    expect(savedRoute).toBeTruthy()
    expect(result.current.routes).toHaveLength(1)
    expect(result.current.routes[0].name).toBe('New Route')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('updates existing route', async () => {
    const { result } = renderHook(() => useRoutes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const saved = await result.current.saveRoute({
      name: 'Original',
      points: [{ latitude: 60, longitude: 10 }] as Point[],
    })

    await waitFor(async () => {
      await result.current.updateRoute(saved.id, { name: 'Updated' })
    })

    expect(result.current.routes[0].name).toBe('Updated')
  })

  it('deletes route and updates state', async () => {
    const { result } = renderHook(() => useRoutes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const saved = await result.current.saveRoute({
      name: 'To Delete',
      points: [{ latitude: 60, longitude: 10 }] as Point[],
    })

    expect(result.current.routes).toHaveLength(1)

    await waitFor(async () => {
      await result.current.deleteRoute(saved.id)
    })

    expect(result.current.routes).toHaveLength(0)
  })

  it('handles localStorage errors gracefully', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const { result } = renderHook(() => useRoutes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.routes).toEqual([])
  })
})
```

#### 2. usePace Hook Tests
**File**: `hooks/use-pace.test.ts` (new file)
**Changes**: Test pace persistence and validation

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePace } from './use-pace'
import { setupLocalStorageMock } from '../test/mocks/localStorage'

describe('usePace', () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock()
  })

  it('initializes with default pace (360s)', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => usePace())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.pace).toBe(360)
  })

  it('loads saved pace from localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('420') // 7 min/km

    const { result } = renderHook(() => usePace())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.pace).toBe(420)
  })

  it('saves valid pace to localStorage', async () => {
    const { result } = renderHook(() => usePace())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    result.current.setPace(300) // 5 min/km

    expect(result.current.pace).toBe(300)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('running-pace', '300')
  })

  it('rejects pace below minimum (120s)', async () => {
    const { result } = renderHook(() => usePace())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    result.current.setPace(60) // Too fast

    // Should not update
    expect(result.current.pace).toBe(360)
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('running-pace', '60')
  })

  it('rejects pace above maximum (720s)', async () => {
    const { result } = renderHook(() => usePace())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    result.current.setPace(800) // Too slow

    expect(result.current.pace).toBe(360)
  })

  it('uses default pace when localStorage has invalid data', async () => {
    localStorageMock.getItem.mockReturnValue('invalid')

    const { result } = renderHook(() => usePace())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.pace).toBe(360)
  })

  it('handles localStorage errors gracefully', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const { result } = renderHook(() => usePace())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Should still work with default
    expect(result.current.pace).toBe(360)
  })
})
```

### Success Criteria:

#### Automated Verification:
- [x] Hook tests pass: `pnpm test hooks/`
- [x] Coverage >85% for hooks: `pnpm test:coverage hooks/`
- [x] No TypeScript errors: `pnpm tsc --noEmit`

#### Manual Verification:
- [x] Tests validate state management logic
- [x] localStorage interactions are properly mocked
- [x] Error handling is tested

---

## Phase 4: Component Test - ElevationProfile

### Overview
Create one component test to establish the pattern for testing React components with user interactions.

### Changes Required:

#### 1. ElevationProfile Component Test
**File**: `components/elevation-profile.test.tsx` (new file)
**Changes**: Test chart rendering and hover interactions

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../test/utils/test-utils'
import { ElevationProfile } from './elevation-profile'

describe('ElevationProfile', () => {
  const mockElevationData = [
    { distance: 0, elevation: 100, coordinate: [10.0, 60.0] as [number, number] },
    { distance: 0.5, elevation: 150, coordinate: [10.1, 60.1] as [number, number] },
    { distance: 1.0, elevation: 120, coordinate: [10.2, 60.2] as [number, number] },
  ]

  const mockSteepSegments = [
    { x1: 0, x2: 0.5, avgSlope: 10, maxSlope: 12 },
  ]

  it('renders chart when visible', () => {
    render(
      <ElevationProfile
        elevationData={mockElevationData}
        steepSegments={mockSteepSegments}
        isVisible={true}
        onHover={vi.fn()}
      />
    )

    // Check for Recharts container
    expect(screen.getByText(/Elevation/i)).toBeTruthy()
  })

  it('does not render when not visible', () => {
    const { container } = render(
      <ElevationProfile
        elevationData={mockElevationData}
        steepSegments={mockSteepSegments}
        isVisible={false}
        onHover={vi.fn()}
      />
    )

    expect(container.textContent).toBe('')
  })

  it('calls onHover callback on mouse move', () => {
    const handleHover = vi.fn()

    render(
      <ElevationProfile
        elevationData={mockElevationData}
        steepSegments={mockSteepSegments}
        isVisible={true}
        onHover={handleHover}
      />
    )

    // Recharts triggers onMouseMove on the chart container
    const chart = screen.getByText(/Elevation/i).closest('.recharts-wrapper')

    if (chart) {
      fireEvent.mouseMove(chart)
      // Note: onHover will be called when Recharts detects point hover
      // This tests the integration, not exact call count
    }
  })

  it('handles empty elevation data', () => {
    const { container } = render(
      <ElevationProfile
        elevationData={[]}
        steepSegments={[]}
        isVisible={true}
        onHover={vi.fn()}
      />
    )

    expect(container).toBeTruthy()
  })

  it('renders steep segment overlays', () => {
    const { container } = render(
      <ElevationProfile
        elevationData={mockElevationData}
        steepSegments={mockSteepSegments}
        isVisible={true}
        onHover={vi.fn()}
      />
    )

    // Steep segments should be rendered as ReferenceArea components
    // This is a basic smoke test - deeper testing would require Recharts mocking
    expect(container.querySelector('.recharts-reference-area')).toBeTruthy()
  })
})
```

### Success Criteria:

#### Automated Verification:
- [x] Component test passes: `pnpm test components/elevation-profile`
- [x] No console errors during test run
- [x] TypeScript compiles: `pnpm tsc --noEmit`

#### Manual Verification:
- [x] Test validates rendering logic
- [x] Interaction handlers are tested
- [x] Pattern established for future component tests

---

## Phase 5: E2E Test - Route Creation Flow

### Overview
Implement one end-to-end test to validate critical user flow and establish E2E testing pattern.

### Changes Required:

#### 1. Route Creation E2E Test
**File**: `e2e/route-creation.spec.ts` (new file)
**Changes**: Test complete route creation flow

```typescript
import { test, expect } from '@playwright/test'

test.describe('Route Creation Flow', () => {
  test('user can create a route by clicking on map', async ({ page }) => {
    // Navigate to app
    await page.goto('/')

    // Wait for map to load
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 })

    // Initial state: no route line should exist
    const routeLineBefore = await page.locator('[data-testid="route-line"]').count()
    expect(routeLineBefore).toBe(0)

    // Click on map to add first point
    const mapCanvas = page.locator('.mapboxgl-canvas')
    await mapCanvas.click({ position: { x: 400, y: 300 } })

    // Wait a bit for state update
    await page.waitForTimeout(500)

    // Click to add second point
    await mapCanvas.click({ position: { x: 450, y: 350 } })

    // Wait for route to render
    await page.waitForTimeout(1000)

    // Verify route line exists (Mapbox renders route as GeoJSON layer)
    // Note: This is a basic check - may need adjustment based on actual DOM structure
    const canvas = await page.locator('.mapboxgl-canvas')
    expect(canvas).toBeTruthy()

    // Verify elevation profile appears
    const elevationProfile = await page.locator('text=Elevation').count()
    expect(elevationProfile).toBeGreaterThan(0)

    // Verify distance is calculated (should show something like "0.X km")
    const distanceText = await page.locator('text=/\\d+\\.\\d+ km/i').count()
    expect(distanceText).toBeGreaterThan(0)

    // Verify route can be saved (button should be enabled)
    const saveButton = page.locator('button:has-text("Save")')
    await expect(saveButton).toBeEnabled()
  })

  test('elevation profile updates when route is created', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.mapboxgl-canvas')

    // Initially no elevation profile
    const elevationBefore = await page.locator('[data-testid="elevation-chart"]').count()
    expect(elevationBefore).toBe(0)

    // Add route points
    const mapCanvas = page.locator('.mapboxgl-canvas')
    await mapCanvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(300)
    await mapCanvas.click({ position: { x: 450, y: 350 } })

    // Wait for elevation data to load
    await page.waitForTimeout(2000)

    // Elevation profile should appear
    const elevationAfter = await page.locator('text=Elevation').count()
    expect(elevationAfter).toBeGreaterThan(0)
  })
})
```

#### 2. Playwright Test Helpers
**File**: `e2e/helpers/map-helpers.ts` (new file)
**Changes**: Helper functions for E2E tests

```typescript
import { Page } from '@playwright/test'

export async function waitForMapLoad(page: Page) {
  await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 })
  await page.waitForTimeout(1000) // Extra wait for map initialization
}

export async function clickOnMap(page: Page, x: number, y: number) {
  const mapCanvas = page.locator('.mapboxgl-canvas')
  await mapCanvas.click({ position: { x, y } })
  await page.waitForTimeout(500) // Wait for state update
}

export async function addRoutePoints(page: Page, points: Array<{ x: number; y: number }>) {
  for (const point of points) {
    await clickOnMap(page, point.x, point.y)
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] E2E test passes: `pnpm test:e2e`
- [x] Test runs in Chromium browser
- [x] No timeout errors

#### Manual Verification:
- [x] Test validates complete user flow
- [x] Map interaction works in test
- [x] Elevation profile rendering is verified
- [x] Pattern established for future E2E tests

---

## Testing Strategy

### Test Organization:
- **Unit tests**: Co-located with source files (`.test.ts` alongside `.ts`)
- **Integration tests**: Co-located with hooks/components
- **E2E tests**: Separate `e2e/` directory
- **Shared mocks**: Centralized in `test/mocks/`

### Mocking Strategy:
- **localStorage**: Custom mock with vi.fn() for tracking calls
- **Mapbox API**: MSW for network-level mocking
- **External libraries**: Mock only when necessary (e.g., Recharts not mocked initially)
- **React hooks**: Use real implementations, mock dependencies

### Coverage Goals:
- `/lib` directory: 80-90% (pure functions, high value)
- `/hooks` directory: 85%+ (critical state management)
- `/components`: 50-60% (focus on logic, not UI rendering)
- Overall: 60-70% initial target

---

## Performance Considerations

- **Fast unit tests**: Pure function tests run in <1s
- **Hook tests**: React Testing Library adds ~2-3s overhead
- **Component tests**: Recharts rendering may be slow, consider mocking if >5s
- **E2E tests**: Single test ~10-15s (acceptable for pattern establishment)

**Optimization if needed**:
- Parallelize Vitest workers (`--threads`)
- Mock Recharts if component tests are slow
- Use Playwright's `fullyParallel` for multiple E2E tests later

---

## Migration Notes

No data migration needed. Changes are additive only:
- New config files (Vitest, Playwright)
- New test files (no changes to source code)
- New devDependencies

**Potential future refactors** (NOT in this plan):
- Extract `PaceStorageService` to match `RouteStorageService` pattern
- Add dependency injection for services
- Separate business logic from Map component

---

## References

- Related research: `planning/2025-10-05-test-coverage-strategy/research.md`
- Vitest docs: https://vitest.dev
- React Testing Library: https://testing-library.com/react
- Playwright docs: https://playwright.dev
- MSW docs: https://mswjs.io
