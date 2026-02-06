---
date: 2026-01-27T12:00:00+01:00
researcher: Claude
git_commit: f2366ea5c6fd8e69602d814da075a6d260b1eb38
branch: main
repository: soneto
topic: "Pan and zoom map to fit loaded route"
tags: [research, codebase, map, route-loading, mapbox, viewport]
status: complete
last_updated: 2026-01-27
last_updated_by: Claude
---

# Research: Pan and Zoom Map to Fit Loaded Route

**Date**: 2026-01-27T12:00:00+01:00
**Researcher**: Claude
**Git Commit**: f2366ea5c6fd8e69602d814da075a6d260b1eb38
**Branch**: main
**Repository**: soneto

## Research Question

When loading a stored route, the map should pan and zoom to fit the entire loaded route in the viewport, making it easier for users to understand that a new route has been loaded.

## Summary

The application currently loads routes by simply setting the `routePoints` state, which renders markers but does not adjust the map viewport. The Map component has access to a `mapRef` that can call Mapbox methods like `fitBounds`, but this functionality is not currently used for route loading. Implementing this feature would require:

1. Detecting when a route is loaded (vs. points added one-by-one)
2. Calculating bounding box from route points
3. Calling `fitBounds` on the map instance with appropriate padding

## Detailed Findings

### Current Route Loading Flow

When a user loads a saved route, the following chain of events occurs:

1. **User clicks "Last inn"** in the routes dropdown
   - `components/header/choose-route.tsx:69-72`
   ```typescript
   onClick={() => {
     document.activeElement.blur();
     onRouteLoad(route.points);
   }}
   ```

2. **Callback propagates to RoutePlannerPage**
   - `components/route-planner-page.tsx:87-89`
   ```typescript
   const handleRouteLoad = (routePoints: Array<Point>) => {
     setRoutePoints(routePoints);
   };
   ```

3. **Map receives new routePoints as props**
   - `components/map.tsx:101` - routePoints prop
   - Markers are rendered via `<Markers route={routePoints} ... />`

**Key observation**: The route loading simply updates state. There is no map viewport manipulation when loading a route.

### Existing Map Viewport Control

The Map component already has viewport manipulation capability:

**File**: `components/map.tsx:46, 160-167`

```typescript
const mapRef = useRef<MapRef>(null);
// ...
<UserLocationMarker
  onLocationFound={(location) => {
    mapRef.current.jumpTo({
      center: [location.longitude, location.latitude],
      zoom: 15,
    });
  }}
/>
```

This shows that:
- The `mapRef` is accessible and functional
- `jumpTo` method is already used for user location
- Other Mapbox methods like `fitBounds` would work similarly

### Available Mapbox Methods for Viewport Control

The application uses `react-map-gl` v8.1.0 with `mapbox-gl` v3.16.0. Through `mapRef.current`, these methods are available:

| Method | Purpose | Suitable for Route Fitting |
|--------|---------|---------------------------|
| `jumpTo(options)` | Instant transition to center/zoom | No - requires manual bounds calculation |
| `flyTo(options)` | Animated transition to center/zoom | No - requires manual bounds calculation |
| `fitBounds(bounds, options)` | Fit map to geographic bounds | **Yes - ideal for this use case** |
| `easeTo(options)` | Smooth transition with easing | No - requires manual bounds calculation |

### Point Data Structure

**File**: `lib/map/point.tsx:1-4`
```typescript
export type Point = {
  latitude: number;
  longitude: number;
};
```

To use `fitBounds`, points need to be converted to `LngLatBounds`:
```typescript
// Example bounds calculation
const bounds = new LngLatBounds();
routePoints.forEach(point => {
  bounds.extend([point.longitude, point.latitude]);
});
mapRef.current.fitBounds(bounds, { padding: 50 });
```

### Map Component Props

**File**: `components/map.tsx:25-35`

```typescript
interface MapContainerProps {
  mapboxToken: string;
  routePoints: Array<Point>;
  setRoutePoints: (points: Array<Point>) => void;
  directions: Array<Directions>;
  setElevation: (...) => void;
  hoveredElevationIndex: number | null;
  onElevationHover: (index: number | null) => void;
}
```

Currently, there's no way to signal "a route was just loaded" to the Map component. The component cannot distinguish between:
- Points being added one at a time (user clicking on map)
- All points being replaced at once (route loading)

### Initial Route from URL

Routes can also be loaded via URL parameter:

**File**: `components/route-planner-page.tsx:24-35`
```typescript
const [routePoints, setRoutePoints] = useState<Array<Point>>(() => {
  if (initialRoute && initialRoute.length > 0) {
    return initialRoute;
  }
  // ...
});
```

This case would also benefit from viewport fitting, but happens during component initialization, not via a callback.

## Code References

- `components/map.tsx:46` - Map ref declaration
- `components/map.tsx:160-167` - Existing viewport manipulation with `jumpTo`
- `components/map.tsx:125-129` - Initial viewport state (Oslo, zoom 3)
- `components/route-planner-page.tsx:87-89` - Route load handler
- `components/header/choose-route.tsx:69-72` - Route load button click
- `lib/map/point.tsx:1-4` - Point type definition

## Architecture Insights

### Current Architecture Limitations

1. **No route load signal**: The Map component receives `routePoints` as a prop but cannot detect whether points were loaded all at once (route load) or added incrementally (user clicks).

2. **Unidirectional data flow**: Route loading happens in parent (`RoutePlannerPage`), but map control (`mapRef`) is in child (`Map`). Need either:
   - Pass a signal/callback down to Map
   - Lift map control up via ref forwarding/imperative handle

### Potential Implementation Approaches

**Approach 1: Add `onRouteLoad` callback signal**
- Pass a callback to Map that signals when to fit bounds
- RoutePlannerPage calls it after setting route points
- Pro: Explicit control over when to fit
- Con: Requires prop drilling

**Approach 2: Detect batch route changes in Map**
- Use `useEffect` to detect when multiple points change at once
- Compare previous vs current routePoints length/content
- Pro: No API changes needed
- Con: Heuristic may have edge cases

**Approach 3: Use imperative handle**
- Expose `fitToRoute()` method from Map via `useImperativeHandle`
- Parent calls it after loading route
- Pro: Clean API, explicit control
- Con: More complex ref forwarding

**Approach 4: Add `shouldFitBounds` prop**
- Add boolean prop that triggers fitBounds when true
- Reset after fitting
- Pro: Simple to implement
- Con: Requires state management for the flag

## Open Questions

1. Should the map animate to the new bounds (`flyTo`-style) or jump instantly?
2. What padding should be used around the bounds to avoid markers touching edges?
3. Should the initial route from URL also trigger viewport fitting on first render?
4. Should there be a minimum zoom level to prevent over-zooming on very small routes?
