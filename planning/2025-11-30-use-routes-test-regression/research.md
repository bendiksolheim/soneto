---
date: 2025-11-30T20:59:28+0000
researcher: Claude (Sonnet 4.5)
git_commit: 4404c1cc3536ee1ec893c92b58f9a815d94e85c9
branch: main
repository: bendiksolheim/soneto
topic: "useRoutes Test Regression: Auth Dependency Breaking Tests"
tags: [research, testing, regression, hooks, authentication, use-routes, vitest]
status: complete
last_updated: 2025-11-30
last_updated_by: Claude (Sonnet 4.5)
---

# Research: useRoutes Test Regression After Auth Integration

**Date**: 2025-11-30T20:59:28+0000
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: 4404c1cc3536ee1ec893c92b58f9a815d94e85c9
**Branch**: main
**Repository**: bendiksolheim/soneto

## Research Question

The tests in `hooks/use-routes.test.ts` are now failing because the `useRoutes` hook uses the `useAuth` hook to determine if routes should be stored locally or in the cloud. The tests were written before this integration. Should we modify the tests to mock `useAuth`, or should we refactor the hook to reduce coupling?

## Summary

**Verdict: The tests need to be updated, not the hook.**

The `useAuth` dependency in `useRoutes` is **architecturally sound and intentional**. It was added in October 2025 as part of the user authentication feature to enable cloud storage via Supabase. The tests are failing because they predate this integration and don't provide the required `AuthProvider` context.

**Recommended Solution**: Update the tests using **Approach 2** (Provide AuthProvider wrapper) to test both authenticated and anonymous scenarios. This gives better test coverage and validates real-world usage patterns.

**Key Findings**:
1. The dependency is a **legitimate business requirement**, not a code smell
2. The hook correctly implements a **dual-storage strategy** (localStorage for anonymous, Supabase for authenticated users)
3. Tests should validate **both storage paths**, not just the localStorage path
4. The project already has test infrastructure (`test/utils/test-utils.tsx`) that can be extended to provide `AuthProvider`

## Detailed Findings

### 1. Why the Tests Are Failing

**File**: `hooks/use-routes.test.ts`
**Root Cause**: Tests call `renderHook(() => useRoutes())` without providing an `AuthProvider` context.

**Error Message**:
```
Error: useAuth must be used within an AuthProvider
```

**Where It Happens**:
- `hooks/use-auth.tsx:64-66` - The `useAuth` hook throws this error when called outside of `AuthProvider`
- `hooks/use-routes.ts:30` - The hook calls `const { user, isLoading: authLoading } = useAuth()`

**Why Tests Worked Before**: The tests were written before October 8, 2025, when the authentication feature was added. The original implementation only used `RouteStorageService` (localStorage) without any auth dependency.

### 2. Timeline of Implementation

**Original Implementation** (before Oct 8, 2025):
- `useRoutes` only used `RouteStorageService` for localStorage
- Tests passed because there were no dependencies on React context
- All routes stored in browser localStorage

**Current Implementation** (after Oct 8, 2025):
**File**: `planning/2025-10-08-user-authentication/plan.md`

The authentication feature was added to enable:
- GitHub OAuth sign-in
- Cloud storage via Supabase
- Cross-device route synchronization
- Backward compatibility with localStorage for anonymous users

**Integration Point** (`hooks/use-routes.ts:30-67`):
```typescript
const { user, isLoading: authLoading } = useAuth();
const isCloudStorage = !!user;

const loadRoutes = useCallback(async () => {
  if (user) {
    // Load from Supabase
    const cloudRoutes = await SupabaseRouteStorage.getRoutes(user.id);
    // ...
  } else {
    // Load from localStorage
    const localRoutes = RouteStorageService.getRoutesWithDistance();
    // ...
  }
}, [user]);
```

### 3. Architectural Assessment

**Is the useAuth dependency appropriate?**

**YES**. The dependency is:
1. **Intentional**: Part of the planned authentication architecture
2. **Necessary**: The hook needs to know if a user is authenticated to choose the correct storage backend
3. **Domain-appropriate**: Authentication is a legitimate business concern, not an implementation detail
4. **Well-isolated**: The storage logic is cleanly separated into two services (`RouteStorageService` and `SupabaseRouteStorage`)

**Architecture Strengths**:
- API symmetry between storage implementations (both have identical method signatures)
- Clean separation of concerns (storage logic isolated, auth isolated, hook orchestrates)
- Progressive enhancement (works offline, upgrades to cloud when authenticated)
- Minimal coupling (only depends on `user` object, not the entire auth system)

**Architecture Weaknesses** (not related to testing):
- No storage strategy abstraction (direct if-else branching)
- Data model mismatch (camelCase in localStorage, snake_case from Supabase)
- No migration path when switching from localStorage to cloud

**Verdict**: The hook should NOT be refactored to remove the auth dependency. The dependency is correct.

### 4. Testing Approaches

There are three possible approaches to fix the tests:

#### Approach 1: Mock useAuth (Isolated Testing)

**Implementation**:
```typescript
// At the top of the test file
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    session: null,
    isLoading: false,
    signOut: vi.fn(),
  })),
}));
```

**Pros**:
- Simple, minimal setup
- Tests remain focused on localStorage behavior
- No need to set up AuthProvider

**Cons**:
- Doesn't test the authenticated (cloud storage) path
- Mock may drift from real implementation
- Doesn't validate integration with useAuth
- Fragile if useAuth interface changes

**Best for**: Quick fix to get tests passing

#### Approach 2: Provide AuthProvider Wrapper (Integration Testing) ✅ RECOMMENDED

**Implementation**:
```typescript
// In test/utils/test-utils.tsx
import { AuthProvider } from '@/hooks/use-auth';

function AllTheProviders({ children, initialUser = null }: WrapperProps) {
  return (
    <AuthProvider user={initialUser}>
      {children}
    </AuthProvider>
  );
}

// In use-routes.test.ts
const { result } = renderHook(() => useRoutes(), {
  wrapper: ({ children }) => (
    <AuthProvider user={null}>{children}</AuthProvider>
  ),
});
```

**Pros**:
- Tests real integration with useAuth
- Can test both authenticated and anonymous scenarios
- Validates actual user experience
- Tests are more resilient to refactoring
- Matches how the hook is used in production

**Cons**:
- Slightly more setup code
- Requires understanding of AuthProvider

**Best for**: Comprehensive, production-like testing

#### Approach 3: Separate Test Suites for Each Storage Path

**Implementation**:
```typescript
describe('useRoutes - anonymous user (localStorage)', () => {
  // Wrap with AuthProvider user={null}
  // Test localStorage behavior
});

describe('useRoutes - authenticated user (Supabase)', () => {
  // Wrap with AuthProvider user={mockUser}
  // Mock SupabaseRouteStorage
  // Test cloud storage behavior
});
```

**Pros**:
- Comprehensive test coverage
- Validates both storage strategies
- Clear separation of test scenarios
- Documents expected behavior for each mode

**Cons**:
- Most setup code
- Requires mocking Supabase client
- More tests to maintain

**Best for**: Maximum coverage and documentation

### 5. Recommended Solution

**Use Approach 2 with elements of Approach 3**:

1. **Update `test/utils/test-utils.tsx`** to include `AuthProvider` with configurable initial user
2. **Refactor existing tests** to use the wrapper with `user={null}` (anonymous mode)
3. **Add new test suite** for authenticated mode (optional but recommended)

**Rationale**:
- Maintains test validity by testing real integration
- Allows testing both localStorage and cloud paths
- Uses existing test infrastructure pattern
- Minimal changes to existing tests
- Better long-term maintainability

## Code References

### Current Implementation
- `hooks/use-routes.ts:30` - useAuth dependency: `const { user, isLoading: authLoading } = useAuth()`
- `hooks/use-routes.ts:35` - Storage decision: `const isCloudStorage = !!user`
- `hooks/use-routes.ts:38-67` - loadRoutes with branching logic
- `hooks/use-auth.tsx:62-68` - useAuth hook and error when not in provider
- `hooks/use-auth.tsx:20-60` - AuthProvider implementation

### Test Infrastructure
- `hooks/use-routes.test.ts` - Existing tests (all failing)
- `test/utils/test-utils.tsx:9-11` - AllTheProviders wrapper (currently empty)
- `test/mocks/localStorage.ts` - localStorage mock utility

### Related Planning Documents
- `planning/2025-10-08-user-authentication/plan.md` - Original authentication implementation plan
- `planning/2025-10-08-user-authentication/research.md` - Authentication research
- `planning/2025-10-05-test-coverage-strategy/research.md` - Testing strategy for the project

### Storage Services
- `lib/services/route-storage.ts` - localStorage implementation
- `lib/services/supabase-route-storage.ts` - Supabase cloud storage implementation

## Implementation Plan

### Phase 1: Quick Fix (Get Tests Passing)

**Option A: Update test-utils.tsx**
```typescript
// test/utils/test-utils.tsx
import { AuthProvider } from '@/hooks/use-auth';

interface WrapperProps {
  children: ReactNode;
  initialUser?: any | null;
}

function AllTheProviders({ children, initialUser = null }: WrapperProps) {
  return (
    <AuthProvider user={initialUser}>
      {children}
    </AuthProvider>
  );
}
```

**Option B: Add wrapper directly to tests**
```typescript
// hooks/use-routes.test.ts
import { AuthProvider } from '@/hooks/use-auth';

describe('useRoutes', () => {
  it('initializes with empty routes', async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={null}>{children}</AuthProvider>
      ),
    });
    // ... rest of test
  });
});
```

**Recommendation**: Use Option A to update test-utils.tsx globally.

### Phase 2: Comprehensive Testing (Optional)

Add a separate test suite for authenticated users:

```typescript
describe('useRoutes - authenticated user', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    // Mock SupabaseRouteStorage methods
    vi.mock('@/lib/services/supabase-route-storage');
  });

  it('loads routes from Supabase when authenticated', async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCloudStorage).toBe(true);
    // Verify SupabaseRouteStorage.getRoutes was called
  });
});
```

## Architecture Insights

### Current Architecture (Dual Storage Strategy)

```
┌─────────────────────────────────────────┐
│          Component / Page               │
│  const { routes, saveRoute } = useRoutes() │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│           useRoutes Hook                │
│  ┌───────────────────────────────────┐ │
│  │ const { user } = useAuth()        │ │
│  │ const isCloudStorage = !!user     │ │
│  └───────────────────────────────────┘ │
│                 │                       │
│        ┌────────┴─────────┐            │
│        ↓                   ↓            │
│  ┌──────────┐      ┌─────────────────┐ │
│  │ if (user)│      │ else            │ │
│  └──────────┘      └─────────────────┘ │
└─────────┬───────────────────┬──────────┘
          │                   │
          ↓                   ↓
┌──────────────────┐  ┌─────────────────┐
│ SupabaseRoute    │  │ RouteStorage    │
│ Storage          │  │ Service         │
│ (Cloud/Supabase) │  │ (localStorage)  │
└──────────────────┘  └─────────────────┘
```

### Testing Architecture (Recommended)

```
┌───────────────────────────────────────┐
│      Test File (use-routes.test.ts)   │
│                                       │
│  describe('anonymous user', () => {  │
│    wrapper: <AuthProvider user={null}>│
│    → tests localStorage path         │
│  })                                   │
│                                       │
│  describe('authenticated user', () => {│
│    wrapper: <AuthProvider user={mock}>│
│    → tests Supabase path             │
│  })                                   │
└───────────────────────────────────────┘
```

### Testing Challenges Identified

1. **Supabase Client Mocking**: Will need to mock `@supabase/supabase-js` and the `createClient()` function
2. **Async Loading States**: Both storage paths have different loading characteristics (sync vs async)
3. **AuthProvider State**: The provider has internal state management that may affect tests
4. **Context Boundaries**: Tests must respect React context boundaries

## Related Research

Historical context from planning documents:

1. **Authentication Implementation** (`planning/2025-10-08-user-authentication/plan.md`)
   - Original design for dual-storage strategy
   - Testing strategy for authenticated features (lines 1406-1463)

2. **Test Coverage Strategy** (`planning/2025-10-05-test-coverage-strategy/research.md`)
   - Hook testing patterns with `renderHook`
   - localStorage mocking patterns (lines 459-468)
   - Component testing with React Testing Library

3. **Client/Server Components** (`planning/2025-11-23-client-server-components/research.md`)
   - Discussion of AuthProvider's role in the app
   - Client-side auth state management patterns

## Open Questions

1. **Should we test the Supabase path?**
   - **Answer**: Yes, but as a separate test suite with mocked Supabase client
   - **Rationale**: Validates both code paths and documents expected behavior

2. **Should we refactor to reduce coupling?**
   - **Answer**: No, the coupling is appropriate for this use case
   - **Rationale**: Auth is a domain concern, not an implementation detail

3. **Should we migrate localStorage routes to cloud on login?**
   - **Answer**: Out of scope for this research, but noted as future enhancement
   - **Current behavior**: Routes stay in localStorage after login (potential UX issue)

4. **Do we need integration tests for the auth transition?**
   - **Answer**: Recommended but not critical
   - **Scenario**: User starts anonymous, logs in, expects routes to persist

## Next Steps

### Immediate (Fix Failing Tests)
1. ✅ Update `test/utils/test-utils.tsx` to include `AuthProvider` wrapper
2. ✅ Modify existing tests to use `AuthProvider` with `user={null}`
3. ✅ Run tests to verify they pass
4. ✅ Commit changes

### Short-term (Better Coverage)
5. Add test suite for authenticated users with mocked Supabase
6. Add test for `isCloudStorage` flag behavior
7. Add test for auth state transitions (anonymous → authenticated)

### Long-term (Architecture Improvements)
8. Consider adding storage strategy interface to reduce if-else branching
9. Consider adding localStorage → cloud migration on first login
10. Document the dual-storage pattern in project docs

## Conclusion

The tests are failing due to a **regression introduced by the authentication feature integration**, not because of a design flaw. The solution is to **update the tests to provide the required AuthProvider context**, which will:

1. Make tests pass
2. Test the actual integration
3. Enable testing both storage paths
4. Document expected behavior for both anonymous and authenticated users

The `useAuth` dependency in `useRoutes` is **architecturally appropriate** and should remain. The hook correctly implements a dual-storage strategy that provides a seamless user experience for both anonymous and authenticated users.

**Recommended Action**: Implement Approach 2 (Provide AuthProvider wrapper) in the test infrastructure, then update existing tests to use it.
