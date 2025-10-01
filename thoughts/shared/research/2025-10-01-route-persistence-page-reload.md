---
date: 2025-10-01T19:40:56Z
researcher: Claude
git_commit: 91f4f98c74af0b2e257f742418a37ff015d6b6e7
branch: main
repository: soneto
topic: "Route Persistence Across Page Reloads"
tags: [research, codebase, route-state, persistence, localStorage, url-state]
status: complete
last_updated: 2025-10-01
last_updated_by: Claude
last_updated_note: "Added URL-based persistence comparison and analysis"
---

# Research: Route Persistence Across Page Reloads

**Date**: 2025-10-01T19:40:56Z
**Researcher**: Claude
**Git Commit**: 91f4f98c74af0b2e257f742418a37ff015d6b6e7
**Branch**: main
**Repository**: soneto

## Research Question

How does the application currently handle route state, and what needs to be implemented to persist a plotted route across page reloads?

## Summary

**The application does NOT currently persist the active route across page reloads.** The active route state (`routePoints`, `directions`, `elevation`) lives only in React component state and is lost when the page refreshes.

However, the application DOES have a complete localStorage-based persistence system for **manually saved routes** that users explicitly save via the "Save Route" button. This infrastructure can be leveraged to implement auto-persistence of the active/draft route.

## Detailed Findings

### Active Route State Management (NOT Persisted)

The main route state is managed in the HomePage component using React's `useState` hook:

**[app/page.tsx:19-24](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/app/page.tsx#L19-L24)**
```typescript
const [directions, setDirections] = useState<Array<Directions>>([]);
const [routePoints, setRoutePoints] = useState<Array<Point>>([]);
const [elevation, setElevation] = useState<
  Array<{ distance: number; elevation: number; coordinate: [number, number] }>
>([]);
const [hoveredElevationIndex, setHoveredElevationIndex] = useState<number | null>(null);
```

These state variables hold:
- **`routePoints`**: Array of Point objects (latitude/longitude) representing user-placed markers
- **`directions`**: Mapbox Directions API response containing route geometry
- **`elevation`**: Elevation profile data generated from terrain queries
- **`hoveredElevationIndex`**: UI state for map/graph hover interaction

**State is ephemeral** - it exists only in memory during the React component lifecycle and is destroyed on page reload.

### Data Flow and Derived State

The route state follows a cascade pattern where `routePoints` drives everything:

**[app/page.tsx:32-43](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/app/page.tsx#L32-L43)** - Route fetching effect:
```typescript
useEffect(() => {
  if (routePoints.length > 1) {
    getRoute(routePoints, mapboxToken).then((directions) => {
      setDirections(directions);
    });
  } else {
    setDirections([]);
  }
}, [routePoints, mapboxToken]);
```

This means:
1. User clicks map → `routePoints` updated ([components/map.tsx:59-73](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/components/map.tsx#L59-L73))
2. `useEffect` detects change → fetches `directions` from Mapbox API
3. Map component generates `elevation` data from terrain ([components/map.tsx:48-52](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/components/map.tsx#L48-L52))

**Key insight**: Only `routePoints` needs to be persisted. The other state (`directions`, `elevation`) will be automatically regenerated when `routePoints` is restored.

### Existing Persistence Infrastructure

The application has a complete localStorage-based persistence system for saved routes:

#### Route Storage Service

**[lib/services/route-storage.ts](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/lib/services/route-storage.ts)** - Core storage operations:
- **Lines 12-23**: `getRoutes()` - Retrieves all saved routes from localStorage
- **Lines 59-76**: `saveRoute()` - Saves new route with generated UUID
- **Lines 79-99**: `updateRoute()` - Updates existing route
- **Lines 102-110**: `deleteRoute()` - Removes route by ID
- **Lines 113-115**: `clearAllRoutes()` - Clears all routes
- **Storage key**: `"route-runner-routes"` (line 14)

#### Data Structures

**[lib/types/route.ts:3-8](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/lib/types/route.ts#L3-L8)** - StoredRoute interface:
```typescript
export interface StoredRoute {
  id: string;
  name: string;
  points: Point[];
  createdAt: string;
}
```

**[lib/map/point.tsx:1-4](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/lib/map/point.tsx#L1-L4)** - Point type:
```typescript
export type Point = {
  latitude: number;
  longitude: number;
};
```

#### React Hook Integration

**[hooks/use-routes.ts](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/hooks/use-routes.ts)** provides React integration:
- **Lines 27-29**: Local state management for saved routes
- **Lines 54-78**: `saveRoute()` - Persists new route to localStorage
- **Lines 81-108**: `updateRoute()` - Updates existing route
- **Lines 111-127**: `deleteRoute()` - Removes route
- **Lines 152-154**: `refreshRoutes()` - Reloads from storage

#### Loading Saved Routes

**[app/page.tsx:49-51](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/app/page.tsx#L49-L51)** - Handler for loading saved routes:
```typescript
const handleRouteLoad = (route: RouteWithCalculatedData) => {
  setRoutePoints(route.points);
};
```

This demonstrates the pattern: loading a route simply sets `routePoints`, and the rest follows automatically.

### Map Component Structure

**[components/map.tsx](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/components/map.tsx)** - Main map component:
- **Lines 32-41**: Receives `routePoints` and `setRoutePoints` as props
- **Lines 59-73**: Click handler adds new points using immutable update pattern:
  ```typescript
  setRoutePoints([...routePoints, newPoint])
  ```
- **Lines 148-189**: `generateElevationData()` - Samples route every 30m and queries terrain elevation

**[components/map/markers.tsx](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/components/map/markers.tsx)** - Marker interactions:
- **Lines 12-18**: Click handler removes points by filtering
- **Lines 21-26**: Drag handler updates point coordinates

All state updates follow React immutability patterns (spreading arrays, creating new objects).

### Other Persistence Mechanisms

**Pace Storage**: The app also persists user's running pace preference:
- **[hooks/use-pace.ts](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/hooks/use-pace.ts)** - Stores pace in localStorage under key `"running-pace"`
- Default: 360 seconds (6 min/km)
- Validates pace between 120-720 seconds (2-12 min/km)

**GPX Export**: Export-only functionality (no import):
- **[utils/gpx.ts](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/utils/gpx.ts)** - Converts routes to downloadable GPX files
- Uses `@dwayneparton/geojson-to-gpx` library

## Code References

### State Management
- `app/page.tsx:19-24` - Active route state declarations
- `app/page.tsx:32-43` - Effect that regenerates directions from routePoints
- `app/page.tsx:49-51` - Route loading handler

### Persistence Infrastructure
- `lib/services/route-storage.ts:14` - localStorage key for saved routes
- `lib/services/route-storage.ts:59-76` - Save route implementation
- `lib/services/route-storage.ts:12-23` - Load routes implementation
- `hooks/use-routes.ts:54-78` - React hook for saving routes
- `lib/types/route.ts:3-8` - StoredRoute data structure

### Map Interactions
- `components/map.tsx:59-73` - Click handler that adds points
- `components/map.tsx:48-52` - Effect that generates elevation data
- `components/map/markers.tsx:12-18` - Remove point on click
- `components/map/markers.tsx:21-26` - Update point on drag

### Data Types
- `lib/map/point.tsx:1-4` - Point type definition
- `lib/types/route.ts:3-8` - StoredRoute interface

## Architecture Insights

### State Cascade Pattern
The application uses a cascade pattern where:
1. `routePoints` is the **source of truth** (user-placed markers)
2. `directions` is **derived** via Mapbox Directions API
3. `elevation` is **derived** via terrain queries on the route geometry

This pattern simplifies persistence: only the source of truth needs to be saved.

### Immutable State Updates
All state modifications follow React best practices:
- Spread operators for arrays: `[...routePoints, newPoint]`
- Array methods that return new arrays: `filter()`, `map()`
- Never mutating existing state objects

### localStorage Strategy
The existing storage system demonstrates:
- **JSON serialization** for complex objects
- **UUID generation** for route IDs
- **Error handling** for quota exceeded scenarios ([lib/services/route-storage.ts:130-137](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/lib/services/route-storage.ts#L130-L137))
- **Timestamps** for created/modified tracking

### Component Props Flow
State flows top-down through props:
```
HomePage (owns state)
  └─ Map (receives routePoints, setRoutePoints)
      └─ Markers (receives route, setRoute)
          └─ RouteMarker × n (renders individual markers)
```

## Persistence Strategy Comparison

Two primary approaches exist for persisting route state: **URL-based** and **localStorage-based**.

### Approach 1: URL Query Parameters

Store route points in the URL query string (e.g., `?route=59.9139,10.7522;59.9150,10.7533`).

**Pros:**
- **Shareable routes**: Users can copy/paste URLs to share routes with others
- **Browser history**: Back/forward buttons navigate through route editing history
- **Bookmarkable**: Users can bookmark routes without explicitly saving
- **No storage limits**: Not subject to localStorage quota
- **Cross-device**: Works across devices/browsers via URL sharing
- **Stateless**: No cleanup needed, routes are ephemeral unless saved
- **SEO-friendly**: Routes can be indexed (if made public)

**Cons:**
- **URL length limits**: URLs capped at ~2000 characters (browser-dependent)
  - Approximately 50-100 waypoints maximum with compression
  - Long routes would be truncated or require alternative encoding
- **URL pollution**: Long coordinate strings make URLs ugly and hard to read
- **Manual encoding required**: Need to serialize/deserialize coordinate arrays
- **Router integration**: Requires Next.js router integration (`useSearchParams`, `useRouter`)
- **Back button behavior**: Every route edit creates a history entry (could be overwhelming)
- **Privacy**: Routes visible in browser history, server logs, analytics
- **No metadata**: Can't store route name, creation date, etc. without complexity

**Example URL:**
```
https://soneto.example.com/?route=59.9139,10.7522;59.9150,10.7533;59.9160,10.7544
```

**Implementation complexity**: Medium
- Requires URL encoding/decoding utilities
- Need to integrate with Next.js App Router's `useSearchParams`
- Must handle URL updates without full page reloads
- Need polyline encoding for long routes (similar to Google Maps)

### Approach 2: localStorage

Store route points in browser's localStorage (e.g., key: `"current-route"`).

**Pros:**
- **Simple implementation**: Straightforward `localStorage.setItem/getItem`
- **No URL pollution**: Clean URLs remain unchanged
- **Large storage**: 5-10MB typical limit (thousands of waypoints)
- **Privacy**: Data stays local, not visible in URLs
- **Fast reads/writes**: Synchronous API
- **Existing pattern**: App already uses localStorage for saved routes and pace
- **No router coupling**: Independent of Next.js routing
- **Metadata support**: Can store additional data (timestamps, version, etc.)
- **No history pollution**: Doesn't create browser history entries

**Cons:**
- **Not shareable**: Routes can't be shared via URL
- **Browser-specific**: Data doesn't transfer between browsers/devices
- **Can be cleared**: Lost if user clears browser data
- **Storage quota**: Subject to localStorage limits (rare with route data)
- **No history navigation**: Can't use back/forward to undo route edits
- **Requires manual reset**: User must explicitly clear or reset route

**Example storage:**
```typescript
localStorage.setItem('current-route', JSON.stringify(routePoints));
```

**Implementation complexity**: Low
- Two `useEffect` hooks (save on change, restore on mount)
- Minimal code, follows existing patterns in codebase

### Approach 3: Hybrid (URL + localStorage)

Use URL for shareable routes, localStorage for auto-save drafts.

**Pros:**
- **Best of both worlds**: Shareability + auto-persistence
- **User choice**: Share when needed, auto-save otherwise
- **Explicit sharing**: Only routes user chooses to share appear in URL
- **Fallback mechanism**: Load from URL first, then localStorage

**Cons:**
- **Higher complexity**: Two persistence mechanisms to maintain
- **Conflict resolution**: Need logic to decide URL vs. localStorage priority
- **State synchronization**: Must keep URL and localStorage in sync (or not?)

**Implementation approach:**
1. Auto-save drafts to localStorage continuously
2. Provide "Share" button that generates URL with route encoded
3. On page load: Check URL first, then localStorage
4. User can copy shareable URL when desired

### Recommendation Analysis

**For this use case**, the primary requirement is: *"remember a plotted route even if I refresh the page"*

This suggests **localStorage** is the better choice because:

1. **Matches existing patterns**: App already uses localStorage for routes (`lib/services/route-storage.ts`) and pace (`hooks/use-pace.ts`)
2. **Simple implementation**: Minimal code change (~10 lines)
3. **No URL length concerns**: Can handle very long routes with many waypoints
4. **Privacy**: User's draft routes remain private
5. **Clean URLs**: Doesn't clutter the URL bar

**However**, if route sharing is a future requirement, consider:
- Implementing localStorage first for auto-persistence
- Adding URL-based sharing as a separate feature later
- Using a "Share Route" button that generates a shareable URL on-demand
- This provides both auto-save and shareability without forcing all routes into URLs

### Alternative: Polyline Encoding

If URL-based persistence is chosen, use **polyline encoding** (like Google Maps):
- Compresses coordinates into short strings
- Example: `59.9139,10.7522;59.9150,10.7533` becomes `_p~iF~ps|U_ulL`
- Reduces URL length by ~50-70%
- Library: `@mapbox/polyline` or `polyline-encoded`

**Example:**
```
https://soneto.example.com/?r=_p~iF~ps|U_ulLnnqC_mqNvxq`@
```

This makes URL-based persistence more viable for longer routes.

## Implementation Approach

### Option A: localStorage (Recommended)

To implement auto-persistence of the active route across page reloads:

#### 1. Storage Strategy

Create a new localStorage key for the draft/active route (separate from saved routes):
- Key: `"current-route"` or `"draft-route"`
- Value: Serialized `Point[]` array

#### 2. Persistence Logic

Add to `app/page.tsx`:
```typescript
// Save to localStorage whenever routePoints changes
useEffect(() => {
  if (routePoints.length > 0) {
    localStorage.setItem('current-route', JSON.stringify(routePoints));
  } else {
    localStorage.removeItem('current-route');
  }
}, [routePoints]);

// Restore on mount
useEffect(() => {
  const saved = localStorage.getItem('current-route');
  if (saved) {
    try {
      const points = JSON.parse(saved);
      setRoutePoints(points);
    } catch (e) {
      console.error('Failed to restore route:', e);
      localStorage.removeItem('current-route');
    }
  }
}, []); // Empty deps - runs once on mount
```

#### 3. State Regeneration

No additional work needed - the existing effects will automatically:
1. Fetch `directions` from Mapbox when `routePoints` loads ([app/page.tsx:32-43](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/app/page.tsx#L32-L43))
2. Generate `elevation` data from terrain ([components/map.tsx:48-52](https://github.com/bendiksolheim/soneto/blob/91f4f98c74af0b2e257f742418a37ff015d6b6e7/components/map.tsx#L48-L52))

#### 4. Edge Cases to Consider

- **Empty routes**: Don't persist empty arrays (handled in code above)
- **Clear functionality**: Remove from localStorage when route is reset
- **Stale data**: Consider adding a timestamp to invalidate old drafts
- **Error handling**: Wrap localStorage calls in try-catch for quota/permission issues

#### 5. Alternative: Custom Hook

Extract logic into a reusable hook (following existing pattern in `hooks/use-routes.ts`):
```typescript
// hooks/use-route-persistence.ts
export const useRoutePersistence = () => {
  // Encapsulate save/load logic
  // Handle error cases
  // Provide clear API
}
```

#### 6. Files to Modify

- **Primary**: `app/page.tsx` (add persistence effects around line 19)
- **Optional**: Create `hooks/use-route-persistence.ts` (extract reusable logic)

### Option B: URL Query Parameters

To implement URL-based route persistence:

#### 1. URL Encoding Strategy

Encode route points as comma-separated lat/lng pairs with semicolon separators:
```
?route=59.9139,10.7522;59.9150,10.7533;59.9160,10.7544
```

Or use polyline encoding for compression:
```
?r=_p~iF~ps|U_ulLnnqC
```

#### 2. Next.js App Router Integration

Add to `app/page.tsx`:
```typescript
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Restore from URL on mount
  useEffect(() => {
    const routeParam = searchParams.get('route');
    if (routeParam) {
      const points = decodeRouteFromURL(routeParam);
      setRoutePoints(points);
    }
  }, []); // Only on mount

  // Update URL when route changes
  useEffect(() => {
    if (routePoints.length > 0) {
      const encoded = encodeRouteToURL(routePoints);
      router.replace(`${pathname}?route=${encoded}`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [routePoints]);
}

function encodeRouteToURL(points: Point[]): string {
  return points.map(p => `${p.latitude},${p.longitude}`).join(';');
}

function decodeRouteFromURL(encoded: string): Point[] {
  return encoded.split(';').map(pair => {
    const [lat, lng] = pair.split(',').map(Number);
    return { latitude: lat, longitude: lng };
  });
}
```

#### 3. URL Length Handling

- Monitor URL length and warn/prevent if approaching 2000 characters
- Consider switching to polyline encoding if routes exceed ~50 waypoints
- Provide fallback to localStorage for very long routes

#### 4. Files to Modify

- **Primary**: `app/page.tsx` (add URL integration)
- **New utility**: `lib/url-encoding.ts` (encode/decode functions)
- **Optional**: Add polyline encoding library to `package.json`

## Related Research

- [2025-09-29-elevation-graph-width-shrinking.md](thoughts/shared/research/2025-09-29-elevation-graph-width-shrinking.md) - Elevation graph rendering
- [2025-09-29-elevation-map-hover-interaction.md](thoughts/shared/research/2025-09-29-elevation-map-hover-interaction.md) - Bidirectional hover state
- [2025-09-30-slope-steepness-visualization-techniques.md](thoughts/shared/research/2025-09-30-slope-steepness-visualization-techniques.md) - Elevation visualization

## Open Questions

1. **Which persistence approach is preferred?** localStorage for simplicity, URL for shareability, or hybrid?
2. **Should the draft route expire after a certain time?** (e.g., 24 hours)
3. **Should there be a visual indicator** that the route was restored from a previous session?
4. **Should clearing a route also clear localStorage**, or only when explicitly reset?
5. **Performance**: Should throttle/debounce localStorage writes for routes with many points?
6. **Conflict resolution**: What if user has both a draft route and tries to load a saved route?
7. **Future sharing needs**: Is route sharing via URL a planned feature?
8. **Back button expectations**: For URL approach, should every route edit create a history entry, or use `router.replace()`?
