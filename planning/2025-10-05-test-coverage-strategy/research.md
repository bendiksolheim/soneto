---
date: 2025-10-05T00:00:00+02:00
researcher: Claude (Sonnet 4.5)
git_commit: 583a1edbab7e8eaef19a3056cacbe5899a316cad
branch: main
repository: bendiksolheim/soneto
topic: "Test Coverage Strategy: Quality Testing Implementation for Running Route Planner"
tags: [research, testing, quality, unit-tests, integration-tests, e2e-tests, vitest, playwright, react-testing-library]
status: complete
last_updated: 2025-10-05
last_updated_by: Claude (Sonnet 4.5)
---

# Research: Test Coverage Strategy for Soneto

**Date**: 2025-10-05T00:00:00+02:00
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: 583a1edbab7e8eaef19a3056cacbe5899a316cad
**Branch**: main
**Repository**: bendiksolheim/soneto

## Research Question

How can we improve test coverage in the Soneto codebase from 0% to a quality-focused testing suite? What types of tests are needed, which libraries should be used, and which parts of the codebase should be prioritized for testing?

## Summary

After comprehensive analysis of the Soneto codebase, I recommend a **three-tier testing strategy** focusing on quality over quantity:

1. **Unit Tests (Vitest)** - Priority: Business logic in `/lib`, utility functions
2. **Integration Tests (Vitest + React Testing Library)** - Priority: Custom hooks, component interactions
3. **End-to-End Tests (Playwright)** - Priority: Critical user flows (route creation, save/load, GPX export)

The codebase consists of 9 lib files, 2 custom hooks, 19 components, and a minimal Next.js app structure. The most critical areas for testing are:

- **Highest Priority**: `/lib` directory (pure functions, business logic, calculations)
- **High Priority**: Custom hooks (`useRoutes`, `usePace`)
- **Medium Priority**: Core components (Map, ElevationProfile, CapabilitiesPanel)
- **Lower Priority**: UI library components (already tested by shadcn/ui and Radix)

**Recommended Testing Stack**:
- **Vitest** - Fast, Vite-native test runner for unit/integration tests
- **React Testing Library** - Component testing with user-centric approach
- **Playwright** - Modern E2E testing for critical flows
- **MSW (Mock Service Worker)** - API mocking for Mapbox

## Detailed Findings

### Current State Analysis

**Testing Infrastructure**: None
- No test files exist in the codebase
- No testing libraries in package.json
- No test scripts configured
- Test coverage: 0%

**Codebase Structure**:
- 9 files in `/lib` - Business logic and utilities
- 2 files in `/hooks` - Custom React hooks
- 19 files in `/components` - UI components (14 application + 5 UI library)
- 3 files in `/app` - Next.js pages and layout

### Testing Strategy by Layer

#### 1. Unit Tests - Business Logic (`/lib` directory)

**Priority: HIGHEST** - These are pure functions with no framework dependencies, making them ideal for unit testing.

##### Files to Test (Priority Order):

**1.1 Route Calculations & Distance** [`/lib/types/route.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/types/route.ts)
- **Priority**: Critical - Used for all distance calculations
- **Functions to test**:
  - `getDistanceBetweenPoints()` (line 16-33) - Haversine formula
  - `calculateRouteDistance()` (line 36-45) - Total route distance
- **Test cases**:
  - Known coordinates with expected distances
  - Edge cases: Same point (0 distance), antipodal points
  - Single point routes (should return 0)
  - Precision validation (km accuracy)
- **Complexity**: Medium - Mathematical calculations

**1.2 Route Compression/Decompression** [`/lib/route-compression.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/route-compression.ts)
- **Priority**: Critical - Core feature for URL sharing
- **Functions to test**:
  - `truncateCoordinate()` (line 8-10) - Precision truncation
  - `truncatePoint()` (line 15-20) - Point truncation
  - `compressRoute()` (line 36-51) - Polyline encoding
  - `decompressRoute()` (line 64-82) - Polyline decoding
  - `isValidPolyline()` (line 90-101) - Validation
- **Test cases**:
  - Round-trip: compress → decompress → verify equality
  - Empty arrays handling
  - Invalid polyline strings
  - Precision loss validation (6 decimal places)
  - Error handling for malformed input
- **Complexity**: High - External library dependency (@mapbox/polyline)

**1.3 Elevation & Slope Calculations** [`/lib/elevation/slope.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/elevation/slope.ts)
- **Priority**: High - Domain-specific logic
- **Functions to test**:
  - `calculateSlope()` (line 7-17) - Gradient calculation
  - `getSlopeColor()` (line 25-31) - Color mapping
  - `getSlopeOpacity()` (line 38-43) - Opacity mapping
  - `findSteepSegments()` (line 60-126) - Segment detection algorithm
- **Test cases**:
  - Known elevation/distance pairs → expected slope %
  - Zero distance handling (divide by zero prevention)
  - Steep segment detection with various thresholds
  - Minimum length filtering
  - Color/opacity thresholds validation
- **Complexity**: High - Complex algorithm with edge cases

**1.4 Route Storage Service** [`/lib/services/route-storage.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/services/route-storage.ts)
- **Priority**: High - CRUD operations for routes
- **Functions to test**:
  - `saveRoute()` (line 60-76) - Create with UUID
  - `updateRoute()` (line 79-99) - Modify existing
  - `deleteRoute()` (line 102-110) - Remove by ID
  - `getRoutes()` (line 12-23) - Retrieve all
  - `getRoutesWithDistance()` (line 26-31) - With calculations
- **Test cases**:
  - CRUD operations with mocked localStorage
  - Error handling: QuotaExceededError, invalid JSON
  - ID generation uniqueness
  - Update non-existent route (should return null)
  - Delete non-existent route (should return false)
- **Complexity**: High - Requires localStorage mocking

**1.5 URL Route Sharing** [`/lib/route-url.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/route-url.ts)
- **Priority**: Medium - URL generation and parsing
- **Functions to test**:
  - `generateShareUrl()` (line 15-27) - Create shareable URL
  - `extractRouteFromUrl()` (line 41-57) - Parse URL params
  - `getShareUrlLength()` (line 66-71) - URL length calculation
- **Test cases**:
  - Round-trip: generate → extract → verify points
  - Empty route handling
  - Missing baseUrl (window.location fallback)
  - Server-side rendering (no window object)
- **Complexity**: Medium - Requires window object mocking

**1.6 Mapbox API Integration** [`/lib/mapbox.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/mapbox.ts)
- **Priority**: Medium - External API wrapper
- **Functions to test**:
  - `directions()` (line 32-46) - Fetch walking directions
- **Test cases**:
  - Successful API response parsing
  - Network error handling
  - Coordinate formatting (lng,lat pairs)
  - Mock with MSW (Mock Service Worker)
- **Complexity**: Medium - Requires API mocking

**1.7 Low Priority / Simple Utils**:
- [`/lib/utils.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/utils.ts) - Simple `cn()` utility (low priority, library-dependent)
- [`/lib/map/point.tsx`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/map/point.tsx) - Type definition only (no tests needed)
- [`/lib/map/directions-to-geojson.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/map/directions-to-geojson.ts) - Simple transformation (low priority)

---

#### 2. Integration Tests - Custom Hooks (`/hooks` directory)

**Priority: HIGH** - These hooks manage critical application state and localStorage persistence.

##### Hooks to Test:

**2.1 useRoutes Hook** [`/hooks/use-routes.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/hooks/use-routes.ts)
- **Priority**: Critical - Core route management
- **Testing approach**: Integration tests with React Testing Library's `renderHook`
- **Operations to test**:
  - `saveRoute()` (line 54-78) - Create and persist
  - `updateRoute()` (line 81-108) - Modify existing
  - `deleteRoute()` (line 111-127) - Remove
  - `clearAllRoutes()` (line 130-141) - Wipe all
  - `getRoute()` (line 144-149) - Retrieve by ID
  - `refreshRoutes()` (line 152-154) - Reload from storage
- **Test cases**:
  - Initial load from localStorage
  - Save → verify state update + localStorage
  - Update → verify distance recalculation
  - Delete → verify state filtering
  - Error states: QuotaExceededError, invalid data
  - Loading state transitions
- **Mocking strategy**:
  - Mock `RouteStorageService` methods
  - Mock `localStorage` API
- **Complexity**: High - Stateful with async operations

**2.2 usePace Hook** [`/hooks/use-pace.ts`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/hooks/use-pace.ts)
- **Priority**: Medium - User preference storage
- **Testing approach**: Integration tests with `renderHook`
- **Operations to test**:
  - Initial load from localStorage (line 13-28)
  - `setPace()` validation (line 31-43)
  - Bounds validation (120-720 seconds)
  - Default fallback (360s = 6 min/km)
- **Test cases**:
  - Valid pace save/load
  - Out-of-bounds values (should clamp)
  - Invalid localStorage data (should use default)
  - localStorage error handling
  - isLoaded state timing
- **Mocking strategy**: Mock localStorage
- **Complexity**: Low - Simple value storage

---

#### 3. Integration Tests - React Components

**Priority: MEDIUM** - Focus on core application components, skip UI library components.

##### Components to Test (Priority Order):

**3.1 ElevationProfile** [`/components/elevation-profile.tsx`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/components/elevation-profile.tsx)
- **Priority**: High - Data visualization with interactions
- **Testing approach**: React Testing Library
- **Test cases**:
  - Renders chart with elevation data
  - Hover interactions trigger `onHover` callback
  - Mouse leave clears hover state
  - Steep segment overlays render correctly
  - No rendering when `isVisible={false}`
  - Empty data handling
- **Mocking**: Mock Recharts components if slow
- **Complexity**: Medium - Chart library integration

**3.2 CapabilitiesPanel** [`/components/capabilities-panel.tsx`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/components/capabilities-panel.tsx)
- **Priority**: High - Main UI control panel
- **Testing approach**: React Testing Library
- **Test cases**:
  - Pace adjustment slider updates `onPaceChange`
  - Save dialog opens/closes correctly
  - Save validates non-empty route name
  - Route load triggers `onRouteLoad` callback
  - Delete route confirms and calls `deleteRoute`
  - Share URL copies to clipboard
  - Export GPX triggers callback
  - Reset route triggers callback
  - Buttons disabled when no route points
- **Mocking**: Mock clipboard API, toast notifications
- **Complexity**: High - Many interactions

**3.3 RouteActions** [`/components/route-actions.tsx`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/components/route-actions.tsx)
- **Priority**: Medium - Action buttons
- **Testing approach**: React Testing Library
- **Test cases**:
  - Visibility toggle (slide in/out)
  - Save dialog opens/closes
  - All buttons trigger correct callbacks
  - Tooltips display on hover
- **Complexity**: Low - Simple button interactions

**3.4 Map Component** [`/components/map.tsx`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/components/map.tsx)
- **Priority**: Lower - Complex Mapbox integration
- **Testing approach**: Mock Mapbox GL, test logic only
- **Test cases**:
  - Click adds route point
  - Elevation data generation algorithm
  - Hover sync with elevation profile
  - Point interpolation at distance
- **Mocking**: Mock `react-map-gl`, Mapbox terrain queries
- **Complexity**: Very High - Mapbox-dependent
- **Recommendation**: Focus on unit testing helper functions rather than full component

**3.5 UI Library Components** - **SKIP TESTING**
- Components from `/components/ui/*` are from shadcn/ui and Radix UI
- Already tested by upstream libraries
- Low value to re-test

---

#### 4. End-to-End Tests - Critical User Flows

**Priority: MEDIUM** - Test complete user journeys with real browser.

##### Recommended E2E Tests (Playwright):

**4.1 Route Creation Flow**
- Open app
- Click map to add points (minimum 2 points)
- Verify route line renders
- Verify elevation profile appears
- Verify distance calculation

**4.2 Route Save/Load Flow**
- Create route with points
- Save route with name
- Verify route appears in saved list
- Reload page
- Load saved route
- Verify points restored correctly

**4.3 Route Sharing Flow**
- Create route
- Click "Share" button
- Verify URL copied to clipboard
- Open URL in new tab
- Verify route loads from URL

**4.4 GPX Export Flow**
- Create route
- Click "Export GPX"
- Verify file download triggers
- Validate GPX file structure

**4.5 Pace Calculation Flow**
- Create route with known distance
- Adjust pace slider
- Verify time calculation updates
- Save pace setting
- Reload page
- Verify pace persists

---

### Recommended Testing Libraries & Setup

#### Core Testing Stack

**1. Vitest** - Unit & Integration Test Runner
```json
{
  "devDependencies": {
    "vitest": "^2.1.1",
    "@vitest/ui": "^2.1.1",
    "@vitest/coverage-v8": "^2.1.1"
  }
}
```
**Why Vitest?**
- Native Vite integration (matches Next.js build tool)
- Fast, modern, TypeScript-first
- Jest-compatible API
- Built-in code coverage
- ESM support out of the box

**Configuration**: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
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
        '**/components/ui/**', // Skip shadcn/ui components
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**2. React Testing Library** - Component Testing
```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2"
  }
}
```
**Why React Testing Library?**
- User-centric testing approach (matches project philosophy of "quality over quantity")
- Works seamlessly with Vitest
- Encourages accessible, maintainable tests
- No implementation details testing

**3. Playwright** - E2E Testing
```json
{
  "devDependencies": {
    "@playwright/test": "^1.48.2"
  }
}
```
**Why Playwright?**
- Modern, fast, reliable E2E testing
- Built-in TypeScript support
- Cross-browser testing (Chromium, Firefox, WebKit)
- Network interception for API mocking
- Better than Cypress for this project (no iframe limitations for map testing)

**Configuration**: `playwright.config.ts`
```typescript
import { defineConfig } from '@playwright/test'

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
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**4. MSW (Mock Service Worker)** - API Mocking
```json
{
  "devDependencies": {
    "msw": "^2.6.5"
  }
}
```
**Why MSW?**
- Mock Mapbox API without changing code
- Works in both tests and browser
- Network-level mocking (realistic)
- Better than manual fetch mocking

**Setup**: `test/mocks/handlers.ts`
```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://api.mapbox.com/directions/v5/mapbox/walking/*', () => {
    return HttpResponse.json({
      routes: [
        {
          geometry: 'mock_polyline_string',
          distance: 1000,
          duration: 600,
        },
      ],
    })
  }),
]
```

#### Additional Utilities

**5. localStorage Mocking**
```typescript
// test/mocks/localStorage.ts
export const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

global.localStorage = localStorageMock as any
```

**6. Mapbox GL Mocking**
```typescript
// test/mocks/mapbox.ts
vi.mock('react-map-gl/mapbox', () => ({
  Map: ({ children, onClick }: any) => (
    <div data-testid="mapbox-map" onClick={onClick}>
      {children}
    </div>
  ),
  Source: ({ children }: any) => <div>{children}</div>,
  Layer: () => <div />,
  Marker: ({ children }: any) => <div>{children}</div>,
}))
```

---

### File Structure Recommendation

```
soneto/
├── test/
│   ├── setup.ts                    # Vitest global setup
│   ├── mocks/
│   │   ├── handlers.ts             # MSW API mocks
│   │   ├── localStorage.ts         # localStorage mock
│   │   └── mapbox.ts              # Mapbox GL mocks
│   └── utils/
│       └── test-utils.tsx          # Custom render, helpers
├── lib/
│   ├── types/
│   │   └── route.test.ts          # Unit tests for route.ts
│   ├── route-compression.test.ts   # Unit tests
│   ├── route-url.test.ts          # Unit tests
│   ├── mapbox.test.ts             # Integration tests with MSW
│   ├── elevation/
│   │   └── slope.test.ts          # Unit tests
│   └── services/
│       └── route-storage.test.ts  # Unit tests with localStorage mock
├── hooks/
│   ├── use-routes.test.ts         # Integration tests
│   └── use-pace.test.ts           # Integration tests
├── components/
│   ├── elevation-profile.test.tsx  # Component tests
│   ├── capabilities-panel.test.tsx # Component tests
│   └── route-actions.test.tsx     # Component tests
├── e2e/
│   ├── route-creation.spec.ts
│   ├── route-save-load.spec.ts
│   ├── route-sharing.spec.ts
│   ├── gpx-export.spec.ts
│   └── pace-calculation.spec.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json                    # Updated with test scripts
```

---

### Implementation Plan

#### Phase 1: Setup (Week 1)
1. Install testing dependencies
2. Configure Vitest
3. Configure Playwright
4. Set up MSW for API mocking
5. Create test utilities and mocks
6. Add test scripts to package.json:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage",
       "test:e2e": "playwright test",
       "test:e2e:ui": "playwright test --ui"
     }
   }
   ```

#### Phase 2: Critical Business Logic (Week 2-3)
1. Test `/lib/types/route.ts` - Distance calculations
2. Test `/lib/route-compression.ts` - Compression/decompression
3. Test `/lib/elevation/slope.ts` - Slope calculations
4. Test `/lib/services/route-storage.ts` - CRUD operations
5. Target: 80%+ coverage for `/lib` directory

#### Phase 3: State Management (Week 3-4)
1. Test `useRoutes` hook - Full CRUD cycle
2. Test `usePace` hook - Settings persistence
3. Target: 90%+ coverage for `/hooks` directory

#### Phase 4: Critical Components (Week 4-5)
1. Test `ElevationProfile` - Chart interactions
2. Test `CapabilitiesPanel` - Main controls
3. Test `RouteActions` - Action buttons
4. Target: 70%+ coverage for priority components

#### Phase 5: E2E Flows (Week 5-6)
1. Implement 5 critical user flows
2. Set up CI/CD integration
3. Add visual regression testing (optional)

---

### Quality Metrics & Goals

#### Coverage Targets (Realistic for Quality-First Approach)

| Area | Target Coverage | Rationale |
|------|----------------|-----------|
| `/lib` directory | 85-95% | Pure functions, high testability |
| `/hooks` directory | 80-90% | Critical state management |
| Core components | 60-70% | Focus on logic, not UI rendering |
| E2E critical flows | 5 flows | User-facing functionality |

#### Quality Indicators
- All tests should be **meaningful** (no "it renders" only tests)
- Focus on **behavior**, not implementation
- Tests should **fail when they should** (avoid false positives)
- Maintain **fast test suite** (<5 seconds for unit/integration)
- E2E tests should be **stable** (no flaky tests)

#### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage
      - run: pnpm test:e2e
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

---

## Code References

### Business Logic (Unit Tests Priority)
- [`lib/types/route.ts:16-33`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/types/route.ts#L16-L33) - Haversine distance calculation
- [`lib/route-compression.ts:36-51`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/route-compression.ts#L36-L51) - Route compression
- [`lib/elevation/slope.ts:60-126`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/elevation/slope.ts#L60-L126) - Steep segment detection
- [`lib/services/route-storage.ts:60-76`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/lib/services/route-storage.ts#L60-L76) - Save route

### State Management (Integration Tests Priority)
- [`hooks/use-routes.ts:54-154`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/hooks/use-routes.ts#L54-L154) - Route CRUD operations
- [`hooks/use-pace.ts:13-43`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/hooks/use-pace.ts#L13-L43) - Pace persistence

### Components (Component Tests Priority)
- [`components/elevation-profile.tsx:63-77`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/components/elevation-profile.tsx#L63-L77) - Hover interactions
- [`components/capabilities-panel.tsx:110-128`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/components/capabilities-panel.tsx#L110-L128) - Share route
- [`components/map.tsx:153-198`](https://github.com/bendiksolheim/soneto/blob/583a1edbab7e8eaef19a3056cacbe5899a316cad/components/map.tsx#L153-L198) - Elevation data generation

---

## Architecture Insights

### Testing-Friendly Patterns Already Present
1. **Functional programming style** - Pure functions in `/lib` make unit testing straightforward
2. **Separation of concerns** - Business logic separated from UI
3. **Service layer abstraction** - `RouteStorageService` can be easily mocked
4. **Type safety** - TypeScript provides strong contracts for testing

### Testing Challenges Identified
1. **Tight localStorage coupling** - `usePace` directly accesses localStorage (should use service layer)
2. **Mapbox integration** - `Map` component is tightly coupled to Mapbox GL (requires extensive mocking)
3. **No dependency injection** - Hard to swap implementations for testing
4. **Window object usage** - `route-url.ts` accesses `window.location` directly

### Recommended Refactors for Better Testability
1. **Extract localStorage service** - Create `PaceStorageService` similar to `RouteStorageService`
2. **Dependency injection** - Pass services as props or use context
3. **Separate presentation from logic** - Extract business logic from `Map` component into testable utilities
4. **Environment abstraction** - Create `getBaseUrl()` utility to handle window.location

---

## Related Research

*No previous research documents found in `planning/` directory related to testing.*

---

## Open Questions

1. **Code coverage threshold enforcement?** - Should we enforce minimum coverage in CI? (Recommendation: Yes, but start low at 60% and increase gradually)

2. **Visual regression testing?** - Should we add screenshot comparison for map/chart components? (Recommendation: Phase 2, use Playwright's built-in screenshot testing)

3. **Performance testing?** - Should we add benchmarks for calculation-heavy functions? (Recommendation: Not initially, add when performance becomes an issue)

4. **Mocking strategy for Mapbox?** - Full mock or use real API with test token? (Recommendation: Mock for unit/integration, real API for E2E)

5. **Test-driven development adoption?** - Should new features require tests first? (Recommendation: Yes, enforce via PR template checklist)

---

## Next Steps

1. **Approve testing stack** - Confirm Vitest + React Testing Library + Playwright + MSW
2. **Set up testing infrastructure** - Install dependencies, configure tools
3. **Start with highest priority** - Begin with `/lib/types/route.ts` and `/lib/route-compression.ts`
4. **Establish team conventions** - Create testing guidelines document
5. **Integrate with CI/CD** - Add automated testing to GitHub Actions
6. **Track coverage growth** - Monitor metrics and adjust strategy

---

## Conclusion

Starting from 0% test coverage, this strategy prioritizes **quality over quantity** by focusing on:
- **Business logic first** (highest ROI, easiest to test)
- **Critical state management** (hooks with localStorage)
- **Key user interactions** (components with complex logic)
- **Complete user flows** (E2E for confidence)

The recommended stack (Vitest + RTL + Playwright + MSW) aligns with modern Next.js/React best practices and the project's existing tech choices. By following the phased implementation plan, the codebase can achieve meaningful test coverage (70-80% overall) within 6 weeks while maintaining code quality and developer velocity.

**Quality indicators of success**:
- Tests catch real bugs during development
- Refactoring becomes safer and faster
- New contributors can understand behavior via tests
- CI/CD pipeline prevents regressions
- Team confidence increases when shipping features
