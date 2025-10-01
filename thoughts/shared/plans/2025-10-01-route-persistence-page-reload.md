# Route Persistence Across Page Reloads Implementation Plan

## Overview

Implement automatic localStorage-based persistence for the active/draft route so that user-placed route points survive page reloads without requiring explicit save actions.

## Current State Analysis

The application currently:
- Manages active route state (`routePoints`, `directions`, `elevation`) in React component state (app/page.tsx:19-24)
- Loses all route state when the page refreshes
- Has a complete localStorage infrastructure for manually saved routes (lib/services/route-storage.ts)
- Follows a cascade pattern where `routePoints` drives everything - `directions` and `elevation` are automatically regenerated via effects (app/page.tsx:32-43, components/map.tsx:48-52)
- Has an existing "Clear Route" button that sets `routePoints` to empty array (app/page.tsx:45-47)
- Already uses localStorage for pace persistence following a similar pattern (hooks/use-pace.ts)

### Key Discoveries:
- Only `routePoints` needs persistence - other state regenerates automatically
- Existing `handleClearRoute` at app/page.tsx:45-47 already provides clear functionality
- Pattern exists in hooks/use-pace.ts:13-28 for loading from localStorage on mount
- Pattern exists in hooks/use-pace.ts:31-43 for saving to localStorage on change

## Desired End State

After implementation:
- User plots a route by clicking on the map
- User refreshes the page or closes/reopens the browser
- The exact same route reappears automatically
- Directions and elevation data regenerate automatically
- No visual indicators or user messages appear
- The existing "Clear Route" button removes both the in-memory state AND the localStorage data

### Verification:
1. Plot a route with multiple waypoints
2. Refresh the page → route reappears with same waypoints
3. Click "Clear Route" → route disappears
4. Refresh the page → route stays cleared (no stale data)
5. Plot a new route → new route persists across refresh

## What We're NOT Doing

- No URL-based persistence
- No visual indicators of auto-save or restore
- No user-facing messages about persistence
- No new UI elements
- No modification to the saved routes system
- No expiration/time-based cleanup of draft routes
- No custom hook extraction (keeping it simple with inline effects)

## Implementation Approach

Add two `useEffect` hooks to app/page.tsx following the exact pattern used in hooks/use-pace.ts:
1. Restore effect: Load `routePoints` from localStorage on component mount
2. Persistence effect: Save `routePoints` to localStorage whenever it changes

Update the existing `handleClearRoute` to also remove the localStorage entry.

## Phase 1: Add Draft Route Persistence

### Overview
Add localStorage persistence for `routePoints` state using two effects and update the clear handler.

### Changes Required:

#### 1. Add localStorage constant
**File**: `app/page.tsx`
**Location**: After imports, before component definition (around line 14)
**Changes**: Add storage key constant

```typescript
const DRAFT_ROUTE_STORAGE_KEY = "draft-route";
```

#### 2. Add restore effect
**File**: `app/page.tsx`
**Location**: After state declarations, before existing `useEffect` for directions (around line 31)
**Changes**: Add effect to restore `routePoints` from localStorage on mount

```typescript
// Restore draft route from localStorage on mount
useEffect(() => {
  try {
    const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
    if (savedRoute) {
      const points = JSON.parse(savedRoute);
      // Validate it's an array
      if (Array.isArray(points)) {
        setRoutePoints(points);
      }
    }
  } catch (error) {
    console.warn("Failed to restore draft route from localStorage:", error);
    // Clean up invalid data
    localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
  }
}, []); // Empty deps - runs once on mount
```

#### 3. Add persistence effect
**File**: `app/page.tsx`
**Location**: After the restore effect, before the directions effect (around line 44)
**Changes**: Add effect to save `routePoints` to localStorage whenever it changes

```typescript
// Save draft route to localStorage whenever routePoints changes
useEffect(() => {
  try {
    if (routePoints.length > 0) {
      localStorage.setItem(DRAFT_ROUTE_STORAGE_KEY, JSON.stringify(routePoints));
    } else {
      // Remove from storage when route is cleared
      localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Failed to save draft route to localStorage:", error);
  }
}, [routePoints]);
```

#### 4. Update clear route handler
**File**: `app/page.tsx`
**Location**: Update existing `handleClearRoute` function (app/page.tsx:45-47)
**Changes**: Add localStorage cleanup to ensure cleared routes don't persist

```typescript
const handleClearRoute = () => {
  setRoutePoints([]);
  try {
    localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear draft route from localStorage:", error);
  }
};
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm build`
- [x] No linting errors: `pnpm lint`
- [x] Application starts without errors: `pnpm dev`

#### Manual Verification:
- [ ] Plot a route with 3+ waypoints, refresh page → route reappears with all waypoints
- [ ] Plot a route, close browser tab, reopen → route persists
- [ ] Plot a route, click "Clear Route" button, refresh → route stays cleared
- [ ] Plot route A, clear it, plot route B, refresh → only route B appears
- [ ] Empty route (0 points) does not create localStorage entry (check DevTools)
- [ ] Invalid localStorage data (manually corrupted) is handled gracefully without crashing
- [ ] Directions and elevation regenerate automatically after restore (observe network requests and graph)
- [ ] Loading a saved route works as before (no conflicts with draft persistence)

---

## Testing Strategy

### Manual Testing Steps:
1. **Basic persistence**:
   - Click on map to create 3 waypoints
   - Open DevTools → Application → Local Storage
   - Verify `draft-route` key exists with JSON array of 3 points
   - Refresh page
   - Verify route reappears with same 3 waypoints
   - Verify directions API is called
   - Verify elevation graph populates

2. **Clear functionality**:
   - With route visible, click "Clear Route" button
   - Verify route disappears from map
   - Verify `draft-route` key removed from localStorage
   - Refresh page
   - Verify route stays cleared

3. **Empty state**:
   - Start with no route
   - Refresh page
   - Verify no errors in console
   - Verify no `draft-route` key in localStorage

4. **Error handling**:
   - With route plotted, open DevTools → Application → Local Storage
   - Manually edit `draft-route` value to invalid JSON (e.g., `"invalid"`)
   - Refresh page
   - Verify app handles gracefully (console warning, no crash)
   - Verify invalid data is removed from localStorage

5. **Interaction with saved routes**:
   - Plot a draft route (e.g., 3 points)
   - Save it as "Test Route"
   - Clear the route
   - Load "Test Route" from saved routes
   - Verify route loads correctly
   - Refresh page
   - Verify loaded route persists as draft

## Performance Considerations

- localStorage writes are synchronous but fast (<1ms for route data)
- JSON serialization/parsing overhead is negligible for typical routes (<100 points)
- No debouncing needed - route points change infrequently (user clicks)
- No storage quota concerns - typical route uses <1KB, localStorage allows 5-10MB

## Migration Notes

No migration needed:
- New feature, no existing data to migrate
- Uses separate storage key from saved routes
- Backward compatible - old localStorage data unaffected

## References

- Original research: `thoughts/shared/research/2025-10-01-route-persistence-page-reload.md`
- Existing pattern: `hooks/use-pace.ts` (pace persistence example)
- Storage service: `lib/services/route-storage.ts` (saved routes infrastructure)
- State management: `app/page.tsx:19-24` (route state declarations)
- State cascade: `app/page.tsx:32-43` (directions regeneration effect)
