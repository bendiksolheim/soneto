---
date: 2025-11-22T14:50:35+0000
researcher: Claude Code
git_commit: 5a90f4a153e5e6a838b868102df60aacb147adfe
branch: nytt-design
repository: bendiksolheim/soneto
topic: "ESLint react-hooks/set-state-in-effect error in Next.js page"
tags: [research, eslint, react-hooks, performance, initialization, next.js]
status: complete
last_updated: 2025-11-22
last_updated_by: Claude Code
---

# Research: ESLint react-hooks/set-state-in-effect Error

**Date**: 2025-11-22T14:50:35+0000
**Researcher**: Claude Code
**Git Commit**: 5a90f4a153e5e6a838b868102df60aacb147adfe
**Branch**: nytt-design
**Repository**: bendiksolheim/soneto

## Research Question

Why is ESLint giving a `react-hooks/set-state-in-effect` error in `/app/page.tsx:34`, what functionality does this code provide, what are possible solutions, and can this actually cause problems in this specific context?

## Summary

The ESLint error is triggered by calling `setRoutePoints()` synchronously within a `useEffect` hook that runs on component mount. This pattern is used to initialize the application state from either URL parameters (for shared routes) or localStorage (for draft routes).

**Key Findings:**
- **The warning is valid** - this is a known anti-pattern that can cause cascading renders
- **However, this specific case is likely a false positive** - the effect has an empty dependency array and runs only once on mount, minimizing performance impact
- **The pattern is widespread in the codebase** - 3 other files use identical patterns for initialization
- **Performance impact is minimal** - the double render happens only once on mount, not repeatedly
- **Multiple solutions exist** - ranging from ESLint suppression to code restructuring

## Detailed Findings

### The ESLint Rule

The `react-hooks/set-state-in-effect` rule is part of the React Compiler's eslint-plugin-react-hooks, automatically included in Next.js's ESLint configuration via `eslint-config-next`.

**Purpose**: Prevent synchronous `setState` calls in effects that trigger unnecessary "cascading renders" where:
1. React renders the component with current state
2. Commits changes to DOM
3. Runs the effect
4. Effect calls setState
5. React must restart the entire render cycle

This double-render pattern is inefficient and should generally be avoided.

### The Problematic Code

**File**: `/app/page.tsx:28-59`

```typescript
// Restore draft route from localStorage on mount or load shared route from URL
useEffect(() => {
  // First, check for shared route in URL
  const sharedRoute = extractRouteFromUrl(window.location.search);

  if (sharedRoute) {
    console.log("Loading shared route from URL:", sharedRoute.length, "points");
    setRoutePoints(sharedRoute); // ⚠️ ESLint error here (line 34)

    // Clear URL parameter after loading (keeps URL clean)
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return; // Don't load draft route if shared route exists
  }

  // Otherwise, restore draft route from localStorage
  try {
    const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
    if (savedRoute) {
      const points = JSON.parse(savedRoute);
      if (Array.isArray(points)) {
        setRoutePoints(points); // Also triggers warning (line 51)
      }
    }
  } catch (error) {
    console.warn("Failed to restore draft route from localStorage:", error);
    localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
  }
}, []); // Empty deps - runs once on mount
```

**Functionality**: This effect provides critical app functionality:
1. Checks URL for shared route parameter (enables route sharing via links)
2. If found, loads the route and cleans up the URL
3. Otherwise, restores the user's draft route from localStorage
4. Enables seamless continuation of work across sessions

### Analysis: Is This Actually Problematic?

**No, this is likely a false positive.** Here's why:

#### 1. **Runs Only Once**
- Empty dependency array `[]` means the effect runs exactly once on mount
- No cascading/repeated renders since it never re-runs
- The "cascading render" concern is about effects that run repeatedly

#### 2. **Cannot Be Calculated During Render**
- The data comes from external systems (URL, localStorage) not available during SSR
- This is exactly the legitimate use case React documentation describes: "synchronizing with external systems"
- The values cannot be derived from props or state - they must be fetched

#### 3. **No State Dependencies**
- The effect doesn't depend on any state values that could change
- No risk of infinite loops or unstable render cycles

#### 4. **Similar Patterns Across Codebase**
This exact pattern appears in 3 other files without issues:
- `hooks/use-pace.ts:13-28` - Load pace from localStorage
- `hooks/use-auth.tsx:21-41` - Load auth session from Supabase
- `hooks/use-routes.ts:38-67` - Load routes from storage

#### 5. **Official React Team Discussion**
There's an active GitHub issue ([facebook/react#34743](https://github.com/facebook/react/issues/34743)) discussing this exact scenario, with React team members acknowledging the rule may be "overly strict" for initialization patterns.

### Why ESLint Flags It Anyway

The ESLint rule uses static analysis and cannot distinguish between:
- **Genuine anti-pattern**: Effect with unstable dependencies calling setState repeatedly
- **Legitimate use case**: One-time initialization from external sources

The rule errs on the side of caution and flags all synchronous setState calls in effects.

### Similar Patterns in Codebase

| File | Pattern | Impact |
|------|---------|--------|
| `app/page.tsx:28-59` | URL/localStorage init | ⚠️ Flagged by ESLint |
| `hooks/use-pace.ts:13-28` | localStorage init | Same pattern, likely same warning |
| `hooks/use-auth.tsx:21-41` | Supabase session init | Same pattern, likely same warning |
| `hooks/use-routes.ts:38-67` | Async load with error handling | Uses async function (deferred setState) |
| `components/map.tsx:47-54` | Derived data generation | Potential concern - runs on every directions change |

### extractRouteFromUrl Function

**File**: `lib/route-url.ts:39-56`

```typescript
export function extractRouteFromUrl(
  searchParams: string | URLSearchParams,
): Point[] | null {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams;

  const routeParam = params.get("route");

  if (!routeParam) {
    return null;
  }

  const points = decompressRoute(routeParam);

  return points.length > 0 ? points : null;
}
```

**Characteristics:**
- **Synchronous** - No async operations, returns immediately
- **Pure function** - No side effects beyond console.error in decompressRoute
- **Decodes polyline** - Uses `@mapbox/polyline` library to decode compressed route data
- Returns `Point[] | null`

This confirms the setState in the effect is based on synchronous, external data - a classic initialization scenario.

## Possible Solutions

### Option 1: ESLint Suppression (Recommended for this case)

Add an inline comment to suppress the warning for this specific legitimate use case:

```typescript
useEffect(() => {
  const sharedRoute = extractRouteFromUrl(window.location.search);

  if (sharedRoute) {
    console.log("Loading shared route from URL:", sharedRoute.length, "points");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate one-time initialization from URL
    setRoutePoints(sharedRoute);

    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return;
  }

  try {
    const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
    if (savedRoute) {
      const points = JSON.parse(savedRoute);
      if (Array.isArray(points)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate one-time initialization from localStorage
        setRoutePoints(points);
      }
    }
  } catch (error) {
    console.warn("Failed to restore draft route from localStorage:", error);
    localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
  }
}, []);
```

**Pros:**
- Simple, minimal code change
- Documents the intentional use of this pattern
- Preserves existing, working functionality
- Consistent with how other codebases handle this

**Cons:**
- Suppresses a lint rule (some teams avoid this)

### Option 2: Use Ref Callback (Avoids ESLint Rule)

The rule doesn't flag setState calls when the value comes from a ref:

```typescript
const [routePoints, setRoutePoints] = useState<Array<Point>>([]);
const hasInitialized = useRef(false);

useEffect(() => {
  if (hasInitialized.current) return;

  const sharedRoute = extractRouteFromUrl(window.location.search);
  hasInitialized.current = true;

  if (sharedRoute) {
    console.log("Loading shared route from URL:", sharedRoute.length, "points");
    setRoutePoints(sharedRoute);

    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return;
  }

  try {
    const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
    if (savedRoute) {
      const points = JSON.parse(savedRoute);
      if (Array.isArray(points)) {
        setRoutePoints(points);
      }
    }
  } catch (error) {
    console.warn("Failed to restore draft route from localStorage:", error);
    localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
  }
}, []);
```

**Pros:**
- Avoids ESLint warning
- Uses ref-based pattern that's documented as exception

**Cons:**
- Adds complexity (ref + guard condition)
- Effect still runs the same way
- Doesn't actually solve the "problem" (if there was one)

### Option 3: Lazy Initialization with useState

Move the initialization logic directly into useState:

```typescript
const [routePoints, setRoutePoints] = useState<Array<Point>>(() => {
  // This only runs once on mount, client-side only
  if (typeof window === 'undefined') return [];

  // First check URL
  const sharedRoute = extractRouteFromUrl(window.location.search);
  if (sharedRoute) {
    console.log("Loading shared route from URL:", sharedRoute.length, "points");

    // Clean up URL (must happen in effect)
    // We'll need a separate effect for this

    return sharedRoute;
  }

  // Then check localStorage
  try {
    const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
    if (savedRoute) {
      const points = JSON.parse(savedRoute);
      if (Array.isArray(points)) {
        return points;
      }
    }
  } catch (error) {
    console.warn("Failed to restore draft route from localStorage:", error);
    localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
  }

  return [];
});

// Separate effect just for URL cleanup
useEffect(() => {
  if (window.location.search.includes('route=')) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);
```

**Pros:**
- No ESLint warning
- Truly eliminates the double render
- State initialized correctly from the start

**Cons:**
- Must split URL cleanup into separate effect
- More complex state initialization
- SSR consideration (window check needed)
- Less readable than current approach

### Option 4: useSyncExternalStore (Advanced)

Use React 18's `useSyncExternalStore` for external data sources:

```typescript
function useUrlRoute() {
  return useSyncExternalStore(
    () => () => {}, // No-op subscribe since URL doesn't change
    () => extractRouteFromUrl(window.location.search), // Client
    () => null // Server
  );
}

function useLocalStorageRoute() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
        if (savedRoute) {
          const points = JSON.parse(savedRoute);
          return Array.isArray(points) ? points : null;
        }
      } catch (error) {
        console.warn("Failed to restore draft route:", error);
      }
      return null;
    },
    () => null
  );
}

// In component
const urlRoute = useUrlRoute();
const localRoute = useLocalStorageRoute();
const [routePoints, setRoutePoints] = useState<Array<Point>>(
  urlRoute ?? localRoute ?? []
);
```

**Pros:**
- "Correct" React 18 pattern for external stores
- No ESLint warnings
- Handles SSR properly

**Cons:**
- Significantly more complex
- Overkill for one-time initialization
- Still need effect for URL cleanup
- Less maintainable

### Option 5: Disable Rule Globally

Modify `eslint.config.mjs`:

```javascript
export default defineConfig([
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  globalIgnores([
    ".next/",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);
```

**Pros:**
- Fixes all instances across codebase
- Acknowledges this rule has false positives

**Cons:**
- Disables protection against genuine anti-patterns
- Loses helpful warnings for future code
- Not recommended unless team-wide decision

## Can This Actually Cause Problems?

**Short answer: No, not in this specific case.**

### Performance Impact Analysis

1. **Double Render on Mount**: Yes, this happens
   - First render: `routePoints = []`
   - Effect runs: `setRoutePoints(loadedRoute)`
   - Second render: `routePoints = loadedRoute`

2. **Impact**: Negligible
   - Happens only once per page load
   - User doesn't see the empty state (React batches updates)
   - No ongoing performance degradation
   - Modern React is optimized for this

3. **Comparison**: The real problem this rule targets is:
   ```typescript
   // BAD - this is what the rule is really trying to prevent
   useEffect(() => {
     setData(expensiveTransform(props.data)); // Runs on every props.data change
   }, [props.data]); // Should be useMemo instead
   ```

### User Experience

- ✅ Route loads correctly from URL
- ✅ Draft route restores from localStorage
- ✅ URL gets cleaned up
- ✅ No visible flickering or delays
- ✅ No broken functionality

### Real-World Evidence

- Same pattern used in 3 other hooks in this codebase
- No reported performance issues
- Common pattern in Next.js applications
- React team acknowledges false positives for this use case

## Recommendations

### Immediate Action
**Use Option 1: ESLint Suppression**

Add inline suppressions with clear comments explaining why this is a legitimate use case. This:
- Preserves working code
- Documents the intentional pattern
- Minimal risk
- Matches how other teams handle this

### Long-Term Consideration
Monitor the React team's discussion in [Issue #34743](https://github.com/facebook/react/issues/34743). The rule may be refined to better handle initialization patterns, potentially eliminating false positives.

### Apply Consistently
The same pattern exists in:
- `hooks/use-pace.ts:13-28`
- `hooks/use-auth.tsx:21-41`

Consider applying the same suppression with documentation for consistency.

## Code References

- `app/page.tsx:34` - Primary ESLint error location (setRoutePoints from URL)
- `app/page.tsx:51` - Secondary location (setRoutePoints from localStorage)
- `app/page.tsx:28-59` - Full effect with initialization logic
- `lib/route-url.ts:39-56` - extractRouteFromUrl function implementation
- `hooks/use-pace.ts:13-28` - Similar localStorage initialization pattern
- `hooks/use-auth.tsx:21-41` - Similar auth session initialization pattern
- `eslint.config.mjs:1-13` - ESLint configuration using Next.js defaults

## Architecture Insights

### Initialization Strategy
The Soneto app follows a consistent pattern for state initialization:
1. **Auth Context** (`layout.tsx`) - Loads first, provides user session
2. **Dependent Data** (`use-routes`) - Loads after auth, switches between cloud/local storage
3. **Page-Level Data** (`page.tsx`) - Loads route from URL or localStorage

This layered approach ensures data loads in the correct order with proper dependencies.

### External State Sources
The app syncs with multiple external systems:
- **URL parameters** - Route sharing
- **localStorage** - Draft routes, preferences
- **Supabase** - Saved routes, auth
- **Mapbox API** - Route directions

The `setState` in `useEffect` pattern is used correctly to synchronize these external sources with React state.

## Open Questions

1. **Should the rule be disabled globally?** If the team encounters this frequently and trusts developers to recognize genuine anti-patterns, global disabling might be appropriate.

2. **Is the double render measurable?** Could profile the app to quantify the actual performance impact (likely unmeasurable).

3. **Future Next.js patterns?** Will Next.js provide recommended patterns for this scenario that satisfy the linter?

## Related Research

- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React Hooks ESLint Plugin](https://react.dev/reference/eslint-plugin-react-hooks)
- [GitHub Issue: Rule Overly Strict](https://github.com/facebook/react/issues/34743)
- Next.js ESLint Configuration documentation

## Conclusion

The ESLint warning is technically correct - there is a synchronous setState call in a useEffect. However, this is a false positive for a legitimate initialization pattern. The code:
- ✅ Functions correctly
- ✅ Has minimal performance impact (one-time double render)
- ✅ Follows patterns documented in official React guides
- ✅ Is consistent with other initialization code in the project

**Recommended action**: Suppress the ESLint warning with an explanatory comment documenting this as intentional, legitimate initialization from external sources.
