---
date: 2025-11-23T20:30:57+0000
researcher: Claude (Sonnet 4.5)
git_commit: 574fe827c7f9e69aab64e9d8c6fd1712c4732acf
branch: nytt-design
repository: bendiksolheim/soneto
topic: "Client vs Server Components Usage and the Login State Flash Issue"
tags: [research, codebase, nextjs, server-components, client-components, authentication, ssr]
status: complete
last_updated: 2025-11-23
last_updated_by: Claude (Sonnet 4.5)
---

# Research: Client vs Server Components Usage and the Login State Flash Issue

**Date**: 2025-11-23T20:30:57+0000
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: `574fe827c7f9e69aab64e9d8c6fd1712c4732acf`
**Branch**: `nytt-design`
**Repository**: bendiksolheim/soneto

## Research Question

Is the current usage of client components in the Soneto codebase excessive or a misuse of Next.js? Specifically:
1. Why does the login button flash from "not logged in" to "logged in" state on page refresh?
2. Could and should more components be converted to server components?
3. What are the barriers to using more server components?

## Summary

**Key Findings:**

1. **Client Component Usage is Somewhat Excessive**: Out of 9 components with `"use client"` directive, only 5-6 genuinely require client-side execution. The rest are forced to be client components due to cascading effects from the root `AuthProvider`.

2. **Root Cause of Login Flash**: The login button flashes because:
   - `AuthProvider` initializes with `user: null`
   - The component tree renders immediately with this null state
   - An async call to `supabase.auth.getSession()` resolves later
   - The UI re-renders once the session is retrieved
   - The `isLoading` flag exists but is not used to show a loading state

3. **Primary Blocker to Server Components**: The `AuthProvider` context is wrapped around the entire app in `app/layout.tsx`, making all descendant components client-side by default. This is necessary because authentication state management requires browser APIs and React hooks.

4. **Opportunities for Improvement**:
   - Use server-side session checking for initial auth state
   - Move the `AuthProvider` lower in the component tree
   - Leverage server components for non-interactive parts of the UI
   - Use the existing `isLoading` state to prevent UI flash

## Detailed Findings

### 1. Current Client Component Distribution

**Total Files with `"use client"` Directive: 9**

| Directory | Count | Files |
|-----------|-------|-------|
| `/app` | 1 | `not-found.tsx` |
| `/components` | 4 | `frame.tsx`, `header.tsx`, `map.tsx`, `route-planner-page.tsx` |
| `/components/widgets` | 1 | `elevation-profile.tsx` |
| `/hooks` | 3 | `use-auth.tsx`, `use-routes.ts`, `use-pace.ts` |

**Server Components in `/app`:**
- `app/layout.tsx` - Root layout (server component)
- `app/page.tsx` - Home page (async server component)

### 2. Authentication Architecture and the Flash Issue

#### The Login Button Flash Timeline

```
Page Load
  ↓
[1] AuthProvider mounts with user = null
  ↓
[2] User component renders → Shows "Logg inn" button ⚡ FLASH
  ↓
[3] useEffect runs: supabase.auth.getSession() (async)
  ↓
[4] Session resolves → setUser() called
  ↓
[5] User component re-renders → Shows "Hei, {name}!"
```

**File References:**

- `hooks/use-auth.tsx:17` - Initial state: `const [user, setUser] = useState<User | null>(null);`
- `hooks/use-auth.tsx:25` - Async session fetch: `supabase.auth.getSession().then(...)`
- `components/header.tsx:45-75` - User component renders based on `user` state
- `hooks/use-auth.tsx:18` - Unused loading state: `const [isLoading, setIsLoading] = useState(true);`

#### Why This Happens

1. **Client-Side Initialization**: The `AuthProvider` must initialize on the client because:
   - It uses `useState` and `useEffect` hooks
   - It calls `supabase.auth.getSession()` which requires browser localStorage
   - It sets up real-time listeners via `supabase.auth.onAuthStateChange()`

2. **No Loading State Used**: The `User` component in `header.tsx` doesn't check `isLoading`:
   ```typescript
   function User(): React.ReactElement {
     const { user, signOut } = useAuth(); // ❌ Not using isLoading

     if (user) {
       return /* logged in UI */;
     } else {
       return /* login button */; // ⚡ Renders immediately
     }
   }
   ```

3. **Async Session Retrieval**: Supabase session is stored in browser storage and must be retrieved asynchronously, causing a delay between initial render and auth state resolution.

### 3. Component Tree Architecture

```
app/layout.tsx (Server Component)
└── AuthProvider (Client - "use client" in hooks/use-auth.tsx)
    └── app/page.tsx (Server Component - async)
        └── RoutePlannerPage (Client)
            ├── Frame (Client)
            │   ├── Header (Client)
            │   │   ├── User component
            │   │   └── ChooseRoute component
            │   └── MapFeatures
            └── Map (Client - Mapbox GL requires DOM)
                ├── Route, Markers, etc.
                └── UserLocationMarker (Client - uses Geolocation API)
```

**Key Observation**: The `AuthProvider` context wrapper in `app/layout.tsx` creates a "client component boundary" that affects all descendants. While `app/page.tsx` is technically a server component, most of its children become client components.

### 4. What Components Truly Need to Be Client-Side?

**Legitimately Client-Only:**

1. ✅ `components/map.tsx` - Requires Mapbox GL JS, DOM manipulation, refs
2. ✅ `components/route-planner-page.tsx` - State management for route building, localStorage usage
3. ✅ `components/map/user-location-marker.tsx` - Browser Geolocation API
4. ✅ `components/widgets/elevation-profile.tsx` - Recharts requires DOM
5. ✅ `components/widgets/share.tsx` - Clipboard API, navigator APIs
6. ✅ `hooks/use-auth.tsx` - Supabase auth listeners, browser storage

**Could Be Server Components:**

1. ⚠️ `app/not-found.tsx` - Currently client component, uses `usePathname()` only for logging
2. ⚠️ Parts of `components/header.tsx` - Static portions could be server-rendered
3. ⚠️ `components/frame.tsx` - Mostly composition, could be server component with client children

**Forced to Be Client (Due to Context):**

1. 🔗 Any component using `useAuth()` hook
2. 🔗 Any component using `useRoutes()` hook
3. 🔗 Any component that's a child of a client component

### 5. Data Fetching Patterns

**Current State:**

| Pattern | Count | Example |
|---------|-------|---------|
| Client-side `useEffect` + fetch | 3 | `route-planner-page.tsx` - Mapbox directions API |
| Client-side Supabase SDK | 2 | `use-auth.tsx`, `use-routes.ts` |
| Server Component (async) | 1 | `app/page.tsx` - URL parameter parsing |
| Route Handler (API) | 1 | `app/auth/callback/route.ts` - OAuth callback |
| Server Actions | 0 | None found |

**No API Routes For:**
- Route CRUD operations (handled by Supabase client SDK directly)
- Mapbox API calls (called directly from client)
- Elevation data fetching (Mapbox terrain queries from client)

### 6. Browser API Dependencies

**LocalStorage Usage:**
- `route-planner-page.tsx` - Draft route auto-save
- `use-routes.ts` - Fallback storage for anonymous users
- `use-pace.ts` - Running pace preference

**Other Browser APIs:**
- `navigator.geolocation` - User location (`user-location-marker.tsx`)
- `navigator.clipboard` - Copy share URL (`share.tsx`)
- `window.location`, `window.history` - URL management

**Impact**: These dependencies force their components to be client-side, which is appropriate.

## Architecture Insights

### Pattern: Dual Storage Strategy

The app elegantly handles both authenticated and anonymous users through the `useRoutes` hook:

```typescript
// hooks/use-routes.ts:35
const isCloudStorage = !!user;

// If logged in → Supabase
// If not logged in → localStorage
```

This pattern is clean and user-friendly but requires client-side execution.

### Pattern: Context-Based Auth

The `AuthProvider` pattern is standard for Next.js apps but creates a client component boundary:
- ✅ Proper TypeScript typing
- ✅ Clean hook interface (`useAuth()`)
- ✅ Real-time auth state updates
- ❌ Forces entire app to be client-side

### Design Decision: Client-Heavy Architecture

The app's core functionality (interactive map, real-time route building, elevation visualization) genuinely requires client-side JavaScript. The architecture is appropriate for the use case.

## Code References

- `app/layout.tsx:23` - AuthProvider wrapping entire app
- `hooks/use-auth.tsx:16-54` - AuthProvider implementation
- `hooks/use-auth.tsx:17` - Initial null user state causing flash
- `hooks/use-auth.tsx:18` - Unused isLoading state
- `components/header.tsx:45-75` - User component that flashes
- `app/page.tsx:7-21` - Server component parsing URL params
- `app/auth/callback/route.ts` - OAuth callback route handler
- `hooks/use-routes.ts:29-248` - Dual storage implementation
- `components/route-planner-page.tsx` - Main app logic
- `components/map.tsx` - Mapbox integration

## Recommendations

### 1. Fix the Login Button Flash (Quick Win)

**Use the existing `isLoading` state in the User component:**

```typescript
// components/header.tsx
function User(): React.ReactElement {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="content-center justify-self-end">
        {/* Skeleton or spinner matching button size */}
      </div>
    );
  }

  if (user) {
    return /* logged in UI */;
  } else {
    return /* login button */;
  }
}
```

**Impact**: Eliminates the flash by showing a loading state during auth initialization.
**Effort**: Low (5 minutes)
**File**: `components/header.tsx:45`

### 2. Server-Side Initial Auth Check (Medium Effort)

**Move initial session check to server:**

Currently, the session is fetched client-side in `useEffect`. Instead:
1. Check session in `app/layout.tsx` using server-side Supabase client
2. Pass initial session as prop to `AuthProvider`
3. `AuthProvider` initializes with server session, then sets up client listeners

**Example:**
```typescript
// app/layout.tsx (server component)
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html>
      <body>
        <AuthProvider initialSession={session}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Impact**: Eliminates auth hydration mismatch entirely, server-rendered correct state
**Effort**: Medium (1-2 hours)
**Files**: `app/layout.tsx`, `hooks/use-auth.tsx`

### 3. Move AuthProvider Lower in Tree (High Effort)

**Problem**: `AuthProvider` in root layout forces all pages to be client components.

**Solution**: Only wrap components that need auth state:
- Keep pages as server components
- Wrap specific client components (Header, RoutePlannerPage) with AuthProvider
- May require prop drilling or multiple providers

**Impact**: Enables more server components, reduces bundle size
**Effort**: High (requires significant refactoring)
**Risk**: May complicate component composition

### 4. Extract Static UI to Server Components (Medium Effort)

**Candidate Components:**
- `app/not-found.tsx` - Remove `"use client"`, use route params instead of `usePathname()`
- Parts of `components/header.tsx` - Extract static logo/navigation
- `components/frame.tsx` - Could be server component with client children

**Impact**: Reduced client bundle size, faster initial load
**Effort**: Medium (component-by-component refactoring)

### 5. Create API Routes for External Services (Optional)

**Move Mapbox API calls to API routes:**
- `app/api/directions/route.ts` - Proxy for Mapbox Directions API
- `app/api/geocoding/route.ts` - Proxy for geocoding if needed

**Benefits**:
- Hide API keys from client bundle
- Add server-side validation
- Enable rate limiting
- Better error handling

**Impact**: Improved security, better error handling
**Effort**: Medium (2-4 hours)
**Trade-off**: Adds server-side latency

### 6. Consider Server Actions for Route CRUD (Optional)

**Replace direct Supabase calls with Server Actions:**

```typescript
// app/actions.ts
'use server'

export async function saveRoute(route: Route) {
  const supabase = createServerClient(...);
  // Validation, error handling
  return await supabase.from('routes').insert(route);
}
```

**Benefits**:
- Server-side validation
- Consistent error handling
- Easier to add middleware (logging, analytics)

**Impact**: More maintainable, potentially better UX
**Effort**: High (requires restructuring data layer)

## Should You Change to More Server Components?

**Short Answer**: **Partially, yes** - but with realistic expectations.

### What Makes Sense to Change:

1. ✅ **Fix the login flash** - Use the `isLoading` state (quick win)
2. ✅ **Server-side initial auth** - Check session on server before hydration
3. ✅ **Convert `not-found.tsx`** - No need for client component
4. ⚠️ **Extract static parts of Header** - If it doesn't complicate the code

### What Doesn't Make Sense:

1. ❌ **Make the map a server component** - Requires DOM and Mapbox GL JS
2. ❌ **Make route planner a server component** - Needs real-time interactivity
3. ❌ **Remove AuthProvider context** - Necessary for auth state management
4. ❌ **Force everything to be server-rendered** - Goes against the app's interactive nature

### The Core Issue:

Your app is **fundamentally interactive** - it's a route planning tool with:
- Real-time map manipulation
- Drag-and-drop markers
- Live elevation updates
- Client-side storage for drafts
- Browser geolocation

**This is not a misuse of Next.js** - it's appropriate for a highly interactive application. The majority of your components *should* be client components.

### The Real Problem:

The issue isn't "too many client components" - it's the **hydration mismatch** causing the login button flash. This is a common Next.js pattern issue, not a fundamental architecture problem.

## Priority Recommendations

**High Priority (Do First):**
1. Use `isLoading` state to fix login button flash
2. Implement server-side initial auth check

**Medium Priority (Consider):**
3. Convert `app/not-found.tsx` to server component
4. Create API routes for Mapbox calls (security improvement)

**Low Priority (Optional):**
5. Extract static UI to server components where it doesn't add complexity
6. Move AuthProvider lower in tree (only if refactoring anyway)

## Open Questions

1. **Performance Impact**: Is the current client bundle size actually causing issues? (Check bundle analyzer)
2. **SEO Needs**: Does the app need SEO for any pages? (If yes, server components matter more)
3. **Future Features**: Are there planned features that would benefit from server components?
4. **User Experience**: Is the login flash the only UX issue, or are there others related to client/server rendering?

## Conclusion

The Soneto codebase is **not misusing Next.js** - the architecture is appropriate for an interactive mapping application. The login button flash is a specific hydration timing issue that can be fixed without major architectural changes.

**Recommended Next Steps:**
1. Fix the login flash by using the `isLoading` state (5 minutes)
2. Implement server-side session check in root layout (1-2 hours)
3. Evaluate if the remaining client components are causing actual performance issues
4. Only refactor to more server components if there's a measurable benefit

The current architecture prioritizes interactivity and real-time updates, which is exactly right for a route planning application. Don't let "best practices" push you toward server components where client components are genuinely needed.
