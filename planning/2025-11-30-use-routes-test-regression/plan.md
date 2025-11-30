# Fix useRoutes Test Regression Implementation Plan

## Overview

Fix failing tests in `hooks/use-routes.test.ts` caused by the authentication integration added in October 2025. The `useRoutes` hook now depends on `useAuth`, which requires an `AuthProvider` context. Tests predate this integration and fail with "useAuth must be used within an AuthProvider". This plan implements the recommended Approach 2 from the research: provide `AuthProvider` wrapper in test infrastructure and test both authenticated and anonymous storage paths.

## Current State Analysis

**What Exists:**
- `hooks/use-routes.ts` - Hook with dual storage strategy (localStorage for anonymous, Supabase for authenticated)
- `hooks/use-routes.test.ts` - 6 failing tests that call `renderHook(() => useRoutes())` without context
- `test/utils/test-utils.tsx` - Empty `AllTheProviders` wrapper ready to be enhanced
- `hooks/use-auth.tsx` - AuthProvider that calls `supabase.auth.getUser()` if no initial user provided
- `test/mocks/localStorage.ts` - localStorage mock utility already in place

**Why Tests Are Failing:**
- Tests call `useRoutes` without wrapping in `AuthProvider` (hooks/use-routes.test.ts:17, 45, 57, 87, 115, 149)
- `useAuth` throws error when called outside provider context (hooks/use-auth.tsx:64-66)
- Tests were written before October 2025 authentication integration

**Key Constraints:**
- `AuthProvider` has side effects: calls `supabase.auth.getUser()` on mount if no user provided
- Tests must work with both localStorage (anonymous) and Supabase (authenticated) paths
- Existing test behavior must be preserved (all currently test localStorage path)
- Project uses Vitest with happy-dom environment

## Desired End State

After implementation:
1. All existing tests pass when run with `pnpm test`
2. Tests validate both anonymous (localStorage) and authenticated (Supabase) storage paths
3. Test infrastructure provides reusable `AuthProvider` wrapper with configurable user state
4. Supabase client is properly mocked to prevent network calls in tests
5. Test coverage includes both storage strategies and validates the `isCloudStorage` flag

**Verification:**
- Run `pnpm test hooks/use-routes.test.ts` - all tests pass
- Run `pnpm test:coverage` - coverage maintained or improved
- No console warnings about missing context or unmocked network calls

## What We're NOT Doing

- NOT refactoring the `useRoutes` hook to remove `useAuth` dependency (architecturally sound)
- NOT implementing localStorage → cloud migration on login (future enhancement)
- NOT adding integration tests for auth state transitions (out of scope)
- NOT testing the `AuthProvider` itself (that's a separate concern)
- NOT modifying the Supabase route storage implementation

## Implementation Approach

**Strategy:** Enhance test infrastructure to support both storage paths, then update existing tests to use the enhanced infrastructure. Add comprehensive tests for authenticated users.

**Key Decision:** Use explicit `user` prop in test wrapper to avoid `AuthProvider` side effects calling real Supabase client. This gives tests full control over auth state without complex global mocking.

**Risk Mitigation:**
- Mock Supabase client methods to prevent network calls
- Use Vitest's module mocking for clean, isolated tests
- Preserve existing test structure to minimize changes

---

## Phase 1: Update Test Infrastructure

### Overview
Enhance `test-utils.tsx` to provide `AuthProvider` wrapper and mock the Supabase client to prevent side effects.

### Changes Required:

#### 1. Mock Supabase Client Module
**File**: `test/mocks/supabase.ts` (new file)
**Purpose**: Provide mock Supabase client for tests

```typescript
import { vi } from 'vitest';

// Mock auth methods
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  signOut: vi.fn().mockResolvedValue({ error: null }),
};

// Mock database methods
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

export const mockSupabaseClient = {
  auth: mockAuth,
  from: mockFrom,
};

// Mock the createClient function
export const createClient = vi.fn(() => mockSupabaseClient);
```

#### 2. Update Test Setup
**File**: `test/setup.ts`
**Changes**: Add global Supabase client mock

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock Supabase client globally
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

#### 3. Enhance Test Utils
**File**: `test/utils/test-utils.tsx`
**Changes**: Add AuthProvider to AllTheProviders wrapper

```typescript
import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/hooks/use-auth'
import { User } from '@supabase/supabase-js'

// Add providers here if needed (e.g., ThemeProvider)
interface WrapperProps {
  children: ReactNode
  user?: User | null
}

function AllTheProviders({ children, user = null }: WrapperProps) {
  return (
    <AuthProvider user={user}>
      {children}
    </AuthProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User | null
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { user, ...renderOptions } = options || {}
  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders user={user}>{children}</AllTheProviders>,
    ...renderOptions
  })
}

export * from '@testing-library/react'
export { customRender as render }
```

### Success Criteria:

#### Automated Verification:
- [x] No TypeScript errors: `pnpm tsc --noEmit`
- [x] Test setup file loads without errors
- [x] Mock Supabase client prevents network calls

#### Manual Verification:
- [x] `AuthProvider` wrapper is available in test infrastructure
- [x] Tests can specify `user` prop to control auth state
- [x] No console errors about missing Supabase configuration

---

## Phase 2: Fix Existing Tests (Anonymous User Path)

### Overview
Update all existing tests to use `AuthProvider` wrapper with `user={null}` to test the localStorage (anonymous) storage path.

### Changes Required:

#### 1. Update All Test Cases
**File**: `hooks/use-routes.test.ts`
**Changes**: Wrap all `renderHook` calls with `AuthProvider`

**Pattern to apply to each test:**
```typescript
// Before:
const { result } = renderHook(() => useRoutes());

// After:
const { result } = renderHook(() => useRoutes(), {
  wrapper: ({ children }) => (
    <AuthProvider user={null}>{children}</AuthProvider>
  ),
});
```

**Tests to update:**
1. Line 17: "initializes with empty routes"
2. Line 45: "loads routes from localStorage on mount"
3. Line 57: "saves new route and updates state"
4. Line 87: "updates existing route"
5. Line 115: "deletes route and updates state"
6. Line 149: "handles localStorage errors gracefully"

**Additional import needed:**
```typescript
import { AuthProvider } from "@/hooks/use-auth";
```

### Success Criteria:

#### Automated Verification:
- [x] All 6 existing tests pass: `pnpm test hooks/use-routes.test.ts`
- [x] No console errors or warnings during test execution
- [x] localStorage mock is still called correctly
- [x] Test coverage maintained: `pnpm test:coverage`

#### Manual Verification:
- [x] Tests validate localStorage storage path
- [x] `isCloudStorage` flag is `false` in all existing tests
- [x] Test execution time is reasonable (< 5 seconds)

---

## Phase 3: Add Authenticated User Tests (Supabase Path)

### Overview
Add new test suite for authenticated users that validates the Supabase cloud storage path with properly mocked Supabase methods.

### Changes Required:

#### 1. Add Authenticated User Test Suite
**File**: `hooks/use-routes.test.ts`
**Changes**: Add new `describe` block after existing tests

```typescript
describe("useRoutes - authenticated user (cloud storage)", () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;
  const mockUser = {
    id: "test-user-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2025-01-01T00:00:00.000Z",
  } as any; // Type as any to avoid full User type construction

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
    vi.clearAllMocks();
  });

  it("initializes with empty routes from Supabase", async () => {
    // Mock Supabase getRoutes to return empty array
    const mockSupabase = (await import("@/lib/supabase/client")).createClient();
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toEqual([]);
    expect(result.current.isCloudStorage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("loads routes from Supabase on mount", async () => {
    const mockCloudRoutes = [
      {
        id: "cloud-123",
        user_id: mockUser.id,
        name: "Cloud Route",
        points: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9149, longitude: 10.7532 },
        ],
        distance: 150,
        created_at: "2025-10-05T00:00:00.000Z",
        updated_at: "2025-10-05T00:00:00.000Z",
      },
    ];

    const mockSupabase = (await import("@/lib/supabase/client")).createClient();
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCloudRoutes, error: null }),
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].name).toBe("Cloud Route");
    expect(result.current.routes[0].id).toBe("cloud-123");
    expect(result.current.isCloudStorage).toBe(true);
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });

  it("saves new route to Supabase", async () => {
    const newRouteData = {
      id: "new-cloud-123",
      user_id: mockUser.id,
      name: "New Cloud Route",
      points: [
        { latitude: 60, longitude: 10 },
        { latitude: 60.1, longitude: 10.1 },
      ],
      distance: 15700, // Calculated distance
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockSupabase = (await import("@/lib/supabase/client")).createClient();

    // Mock initial load (empty)
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock insert for save operation
    vi.mocked(mockSupabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newRouteData, error: null }),
    } as any);

    let savedRoute;
    await act(async () => {
      savedRoute = await result.current.saveRoute({
        name: "New Cloud Route",
        points: [
          { latitude: 60, longitude: 10 },
          { latitude: 60.1, longitude: 10.1 },
        ],
      });
    });

    expect(savedRoute).toBeTruthy();
    expect(savedRoute.name).toBe("New Cloud Route");
    expect(result.current.routes).toHaveLength(1);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("updates existing route in Supabase", async () => {
    const existingRoute = {
      id: "existing-123",
      user_id: mockUser.id,
      name: "Original Name",
      points: [{ latitude: 60, longitude: 10 }],
      distance: 0,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    };

    const mockSupabase = (await import("@/lib/supabase/client")).createClient();

    // Mock initial load
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [existingRoute], error: null }),
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock update operation
    const updatedRoute = { ...existingRoute, name: "Updated Name" };
    vi.mocked(mockSupabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRoute, error: null }),
    } as any);

    await act(async () => {
      await result.current.updateRoute("existing-123", { name: "Updated Name" });
    });

    await waitFor(() => {
      expect(result.current.routes[0].name).toBe("Updated Name");
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("deletes route from Supabase", async () => {
    const existingRoute = {
      id: "to-delete-123",
      user_id: mockUser.id,
      name: "To Delete",
      points: [{ latitude: 60, longitude: 10 }],
      distance: 0,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    };

    const mockSupabase = (await import("@/lib/supabase/client")).createClient();

    // Mock initial load
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [existingRoute], error: null }),
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock delete operation
    vi.mocked(mockSupabase.from).mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as any);

    await act(async () => {
      await result.current.deleteRoute("to-delete-123");
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(0);
    });
  });

  it("handles Supabase errors gracefully", async () => {
    // Silence console errors
    vi.spyOn(console, "error").mockImplementation(() => {});

    const mockSupabase = (await import("@/lib/supabase/client")).createClient();
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Supabase error" }
      }),
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.routes).toEqual([]);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] All authenticated user tests pass: `pnpm test hooks/use-routes.test.ts`
- [x] Supabase client methods are called with correct parameters
- [x] No actual network requests made during tests
- [x] Total test count increases from 6 to 12

#### Manual Verification:
- [x] Tests validate Supabase storage path exclusively
- [x] `isCloudStorage` flag is `true` in authenticated tests
- [x] localStorage is never called in authenticated tests
- [x] Error handling for Supabase failures is validated

---

## Testing Strategy

### Unit Tests

**What We're Testing:**
1. **Anonymous User Path (localStorage):**
   - Initialization with empty routes
   - Loading routes from localStorage
   - Saving new routes
   - Updating existing routes
   - Deleting routes
   - Error handling

2. **Authenticated User Path (Supabase):**
   - Initialization with empty routes from cloud
   - Loading routes from Supabase
   - Saving new routes to Supabase
   - Updating existing routes in Supabase
   - Deleting routes from Supabase
   - Error handling for Supabase failures

3. **Storage Strategy Flag:**
   - `isCloudStorage` is `false` for anonymous users
   - `isCloudStorage` is `true` for authenticated users

**Key Edge Cases:**
- Empty storage (both localStorage and Supabase)
- Malformed data from localStorage
- Supabase API errors
- Auth state with `user={null}` explicitly set

### Manual Testing Steps

1. **Run all tests:**
   ```bash
   pnpm test hooks/use-routes.test.ts
   ```
   Verify: All 12 tests pass with no warnings

2. **Check test coverage:**
   ```bash
   pnpm test:coverage
   ```
   Verify: Coverage for `hooks/use-routes.ts` is maintained or improved

3. **Run full test suite:**
   ```bash
   pnpm test
   ```
   Verify: No regressions in other tests

4. **Check for console warnings:**
   Review test output for any unexpected warnings about missing providers or unmocked dependencies

## Performance Considerations

**Test Execution Speed:**
- Mocking Supabase client avoids network latency
- Using `happy-dom` keeps tests fast (no real browser overhead)
- Expected total execution time: < 3 seconds for all 12 tests

**Mock Complexity:**
- Supabase mock is minimal and focused on `from().select().eq().order()` chain
- Auth mock prevents unnecessary side effects
- Mocks are reset between tests to prevent state leakage

## Migration Notes

**No Data Migration Required** - This is a test-only change.

**Breaking Changes:** None - existing test structure is preserved, only wrapped with context.

**Backwards Compatibility:** Fully compatible - tests continue to validate the same behavior.

## References

- Related research: `planning/2025-11-30-use-routes-test-regression/research.md`
- Original authentication plan: `planning/2025-10-08-user-authentication/plan.md`
- Test coverage strategy: `planning/2025-10-05-test-coverage-strategy/research.md`
- Current implementation: `hooks/use-routes.ts:30-248`
- Failing tests: `hooks/use-routes.test.ts:1-160`
- Test infrastructure: `test/utils/test-utils.tsx:1-20`
- AuthProvider: `hooks/use-auth.tsx:20-68`
