# Pan and Zoom Map to Fit Loaded Route - Implementation Plan

## Overview

When loading a stored route (from saved routes or URL), the map should animate smoothly to show the entire route in the viewport. This provides clear visual feedback that a new route has been loaded.

## Current State Analysis

- Routes are loaded by calling `setRoutePoints()` which updates state but doesn't affect the map viewport
- The Map component has a `mapRef` that can call Mapbox methods like `fitBounds`
- Existing `jumpTo` usage for user location shows the pattern works (`components/map.tsx:162-165`)
- No mechanism exists to signal "a route was just loaded" to the Map component

### Key Files:
- `components/map.tsx:46` - mapRef declaration
- `components/route-planner-page.tsx:87-89` - handleRouteLoad function
- `components/route-planner-page.tsx:24-35` - initial route state from URL/localStorage

## Desired End State

When a route is loaded (via "Last inn" button, URL parameter, or localStorage draft), the map smoothly animates to fit the entire route with 50px padding. Single point additions via map clicks do NOT trigger this behavior.

### Verification:
1. Load a saved route → map animates to show full route
2. Open a shared URL with route parameter → map animates to show full route
3. Refresh page with draft route in localStorage → map animates to show full route
4. Click on map to add points → map does NOT pan/zoom

## What We're NOT Doing

- Fitting bounds when adding individual points by clicking
- Fitting bounds when points are deleted
- Centering on a single point (only fit when 2+ points exist)
- Custom padding configuration (hardcoded to 50px for now)

## Implementation Approach

Use Approach 4 from research: Add a `shouldFitBounds` boolean prop that triggers the fit when true. The parent component controls when fitting should occur, and the Map component resets the flag after fitting completes.

## Phase 1: Add fitBounds Mechanism to Map Component

### Overview
Add props and logic to Map component to support controlled viewport fitting.

### Changes Required:

#### 1. Update Map Props Interface
**File**: `components/map.tsx`
**Changes**: Add two new optional props to MapContainerProps

```typescript
interface MapContainerProps {
  mapboxToken: string;
  routePoints: Array<Point>;
  setRoutePoints: (points: Array<Point>) => void;
  directions: Array<Directions>;
  setElevation: (
    elevation: Array<{ distance: number; elevation: number; coordinate: [number, number] }>,
  ) => void;
  hoveredElevationIndex: number | null;
  onElevationHover: (index: number | null) => void;
  shouldFitBounds?: boolean;
  onFitBoundsComplete?: () => void;
}
```

#### 2. Add LngLatBounds Import
**File**: `components/map.tsx`
**Changes**: Import LngLatBounds from mapbox-gl

```typescript
import { LngLatBounds } from "mapbox-gl";
```

#### 3. Destructure New Props
**File**: `components/map.tsx`
**Changes**: Add new props to function signature

```typescript
export function Map({
  mapboxToken,
  routePoints,
  setRoutePoints,
  directions,
  setElevation,
  hoveredElevationIndex,
  onElevationHover,
  shouldFitBounds,
  onFitBoundsComplete,
}: MapContainerProps) {
```

#### 4. Add useEffect for fitBounds
**File**: `components/map.tsx`
**Changes**: Add effect that responds to shouldFitBounds, after the existing useEffect hooks

```typescript
// Fit map bounds when a route is loaded
useEffect(() => {
  if (shouldFitBounds && mapLoaded && routePoints.length >= 2 && mapRef.current) {
    const bounds = new LngLatBounds();
    routePoints.forEach((point) => {
      bounds.extend([point.longitude, point.latitude]);
    });

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 16,
      duration: 1000,
    });

    onFitBoundsComplete?.();
  }
}, [shouldFitBounds, mapLoaded, routePoints, onFitBoundsComplete]);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `pnpm build`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Map component accepts new props without breaking existing functionality
- [ ] Adding points by clicking still works normally

---

## Phase 2: Wire Up Route Loading in RoutePlannerPage

### Overview
Add state management and prop passing to trigger fitBounds when routes are loaded.

### Changes Required:

#### 1. Add shouldFitBounds State
**File**: `components/route-planner-page.tsx`
**Changes**: Add new state variable after existing useState declarations

```typescript
const [shouldFitBounds, setShouldFitBounds] = useState(false);
```

#### 2. Update handleRouteLoad
**File**: `components/route-planner-page.tsx`
**Changes**: Set shouldFitBounds when loading a route

```typescript
const handleRouteLoad = (routePoints: Array<Point>) => {
  setRoutePoints(routePoints);
  setShouldFitBounds(true);
};
```

#### 3. Add useEffect for Initial Route Fitting
**File**: `components/route-planner-page.tsx`
**Changes**: Trigger fit bounds for routes loaded on initialization (URL or localStorage)

```typescript
// Fit bounds when initial route is loaded (from URL or localStorage)
useEffect(() => {
  if (routePoints.length >= 2) {
    setShouldFitBounds(true);
  }
}, []); // Only run on mount
```

Note: This effect runs once on mount. If routePoints has an initial route (from URL or localStorage), it triggers fitting.

#### 4. Pass Props to Map Component
**File**: `components/route-planner-page.tsx`
**Changes**: Add new props to Map component

```typescript
<Map
  mapboxToken={mapboxToken}
  routePoints={routePoints}
  setRoutePoints={setRoutePoints}
  directions={directions}
  setElevation={setElevation}
  hoveredElevationIndex={hoveredElevationIndex}
  onElevationHover={setHoveredElevationIndex}
  shouldFitBounds={shouldFitBounds}
  onFitBoundsComplete={() => setShouldFitBounds(false)}
/>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `pnpm build`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [ ] Click "Last inn" on a saved route → map animates to fit the route
- [ ] Open URL with route parameter → map animates to fit the route
- [ ] Close and reopen browser (with draft in localStorage) → map animates to fit the route
- [ ] Click on map to add individual points → map does NOT pan/zoom
- [ ] Route with 2+ points all fit within viewport with visible padding
- [ ] Very short routes don't zoom in past level 16

---

## Testing Strategy

### Manual Testing Steps:
1. **Saved route loading**:
   - Save a route spanning a large area (e.g., Oslo to Bergen)
   - Clear points, then load the saved route
   - Verify map smoothly animates to show entire route

2. **URL route loading**:
   - Create a share URL for a route
   - Open the URL in a new tab
   - Verify map fits to show the route (not centered on Oslo)

3. **Draft route loading**:
   - Create a route with multiple points
   - Refresh the page
   - Verify map fits to show the draft route

4. **Single point behavior**:
   - Start with empty map
   - Click to add points one by one
   - Verify map never auto-pans/zooms during this process

5. **Edge cases**:
   - Test with exactly 2 points close together (should respect maxZoom: 16)
   - Test with many points spanning a large area
   - Test loading an empty route (should not error)

## References

- Research: `planning/2026-01-27-pan-zoom-loaded-route/research.md`
- Mapbox fitBounds docs: https://docs.mapbox.com/mapbox-gl-js/api/map/#map#fitbounds
- Existing viewport manipulation: `components/map.tsx:162-165`
