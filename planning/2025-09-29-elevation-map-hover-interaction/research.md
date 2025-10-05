---
date: 2025-09-29T19:54:34+0000
researcher: Claude
git_commit: 9f59ebf7dad39ceab38f0889e7cebbcba77965e4
branch: main
repository: soneto
topic: "Interactive hover connection between elevation graph and map route"
tags: [research, codebase, elevation-profile, map, recharts, interaction]
status: complete
last_updated: 2025-09-29
last_updated_by: Claude
---

# Research: Interactive Hover Connection Between Elevation Graph and Map Route

**Date**: 2025-09-29T19:54:34+0000
**Researcher**: Claude
**Git Commit**: 9f59ebf7dad39ceab38f0889e7cebbcba77965e4
**Branch**: main
**Repository**: soneto

## Research Question

How can we implement interactive hover markers that connect the elevation graph with the map route, allowing users to see location on the map when hovering the elevation graph, and vice versa?

## Summary

The current implementation has a functional elevation graph component using Recharts AreaChart that displays elevation data, and a Map component using react-map-gl/mapbox that renders the route. However, there is no interaction between these components.

The key finding is that the elevation data structure already includes geographic coordinates for each data point:
```typescript
Array<{ distance: number; elevation: number; coordinate: [number, number] }>
```

This makes implementing bidirectional hover interaction straightforward:
1. **Graph → Map**: Use Recharts' `onMouseMove` event to capture the hovered data point's index, then display a marker at the corresponding `coordinate` on the map
2. **Map → Graph**: Use Mapbox's hover events to detect the cursor position on the route, find the nearest elevation data point, and highlight it on the chart

## Detailed Findings

### Component Architecture

**Main Page** (`app/page.tsx:1-137`):
- Manages top-level state including `elevation` data
- Coordinates data flow between Map and CapabilitiesPanel
- Current state structure provides perfect foundation for adding hover state

**Map Component** (`components/map.tsx:1-217`):
- Uses react-map-gl v8.0.4 with mapbox-gl v3.12.0
- Renders route using Mapbox Source/Layer components
- Already has marker rendering infrastructure via RouteMarker component
- Route line currently has no interaction handlers
- Supports terrain queries via `mapRef.queryTerrainElevation()`

**ElevationProfile Component** (`components/elevation-profile.tsx:1-85`):
- Uses Recharts 3.0.2 AreaChart
- Receives `elevationData`, `totalDistance`, and `isVisible` props
- Currently only displays tooltip on hover
- No external event handling implemented

**CapabilitiesPanel** (`components/capabilities-panel.tsx:257-277`):
- Integrates ElevationProfile in a 160px fixed-height container
- Serves as intermediary between main page and elevation profile

### Elevation Data Structure and Flow

**Data Generation** (`components/map.tsx:117-158`):

The `generateElevationData()` function:
- Samples the route every 30 meters for smooth resolution
- Uses `interpolatePointAtDistance()` to calculate precise coordinates
- Queries Mapbox terrain elevation at each sampled point
- Returns array with distance (km), elevation (m), and coordinate [lng, lat]

**Flow Diagram**:
```
User adds route points
  ↓
HomePage fetches Mapbox Directions API (app/page.tsx:31-42)
  ↓
Map receives directions → generateElevationData() (components/map.tsx:40-43)
  ↓
setElevation updates HomePage state (app/page.tsx:20-22)
  ↓
CapabilitiesPanel receives elevationData (app/page.tsx:73)
  ↓
ElevationProfile visualizes the data (components/elevation-profile.tsx:16-19)
```

### Recharts Hover Event Handling

**Available Events** (from Recharts 3.0 TypeScript definitions):

AreaChart supports `onMouseMove` with the following state interface:
```typescript
interface MouseHandlerDataParam {
  activeTooltipIndex: number | undefined;  // Index of hovered data point
  isTooltipActive: boolean;                // Whether tooltip is showing
  activeLabel: string | undefined;         // X-axis value at hover point
  activeCoordinate: Coordinate | undefined; // Screen coordinates
}
```

**Implementation Pattern**:
```typescript
<AreaChart
  data={chartData}
  onMouseMove={(state) => {
    if (state.isTooltipActive && state.activeTooltipIndex !== undefined) {
      const dataPoint = elevationData[state.activeTooltipIndex];
      onHover(dataPoint.coordinate, state.activeTooltipIndex);
    }
  }}
  onMouseLeave={() => onHoverEnd()}
>
```

### Mapbox Route Hover Detection

**Current Route Implementation** (`components/map/route.tsx:25-55`):

The route is rendered using Mapbox Source/Layer:
```typescript
<Source type="geojson" data={routeGeoJson}>
  <Layer {...style} />
</Source>
```

**Required Changes for Hover**:
1. Make the layer interactive by adding map-level event handlers
2. Use `map.queryRenderedFeatures()` to detect hover over route layer
3. Calculate nearest elevation data point to cursor position
4. Trigger callback with the hovered index

**Implementation Pattern**:
```typescript
<MapboxMap
  onMouseMove={(e: MapMouseEvent) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ['route-layer']
    });
    if (features.length > 0) {
      // Find nearest elevation point to cursor coordinate
      const nearest = findNearestElevationPoint(e.lngLat, elevationData);
      onRouteHover(nearest.index);
    }
  }}
  onMouseLeave={() => onRouteHoverEnd()}
>
```

### Marker Rendering Infrastructure

**Existing RouteMarker Component** (`components/map/route-marker.tsx:1-88`):
- Already implements draggable markers with custom styling
- Supports different styles for start (green), end (red), and waypoints (blue)
- Has hover tooltips and scale animations

**New Hover Marker Requirements**:
- Different visual style (e.g., purple or orange circle)
- Non-draggable, non-clickable
- Appears only during hover
- Should be visually distinct from route point markers

## Code References

### Key Files and Locations

- `app/page.tsx:20-22` - Elevation state management
- `app/page.tsx:55-62` - Map component integration
- `app/page.tsx:70-87` - CapabilitiesPanel integration
- `components/map.tsx:40-43` - setElevation call in useEffect
- `components/map.tsx:117-158` - generateElevationData function
- `components/map.tsx:161-199` - interpolatePointAtDistance function
- `components/elevation-profile.tsx:6-10` - ElevationProfileProps interface
- `components/elevation-profile.tsx:34-84` - Recharts AreaChart implementation
- `components/map/route.tsx:25-55` - Route rendering with Source/Layer
- `components/map/route-marker.tsx:1-88` - Existing marker implementation

## Architecture Insights

### Design Patterns

1. **State Lifting**: All interactive state should be lifted to `app/page.tsx` to coordinate between Map and ElevationProfile
2. **Controlled Components**: Both Map and ElevationProfile should be controlled by parent state
3. **Coordinate Mapping**: The existing elevation data structure is perfectly designed for this feature - no data structure changes needed
4. **Performance**: The 30-meter sampling resolution provides good balance between detail and performance

### Technical Considerations

1. **Coordinate System**: Elevation data uses `[longitude, latitude]` format (GeoJSON standard)
2. **Index-Based Coordination**: Using array indices to sync hover state is efficient and straightforward
3. **Debouncing**: May need to throttle hover events if performance issues arise
4. **Mobile Support**: Should consider touch events in addition to mouse events
5. **Accessibility**: Hover markers should have appropriate ARIA labels

## Implementation Approach

### Phase 1: Graph → Map Hover

1. Add `hoveredElevationIndex` state to `app/page.tsx`
2. Pass `onHoverChange` callback to ElevationProfile
3. Implement `onMouseMove` and `onMouseLeave` in AreaChart
4. Calculate hovered coordinate: `elevation[hoveredElevationIndex]?.coordinate`
5. Pass `hoveredCoordinate` prop to Map component
6. Render hover marker when `hoveredCoordinate` is not null

### Phase 2: Map → Graph Hover

1. Add route layer hover detection in Map component
2. Implement `findNearestElevationPoint()` utility function
3. Call parent callback with hovered index when route is hovered
4. Highlight the corresponding point on the elevation chart (using Recharts ReferenceArea or ReferenceLine)

### Phase 3: Polish

1. Add smooth animations for marker appearance
2. Style the hover marker distinctly (suggested: orange/purple circle with pulse animation)
3. Synchronize tooltips between map and chart
4. Test performance with long routes (>100km)
5. Add mobile touch support

## Related Research

No previous research documents found in planning/

## Open Questions

1. Should the hover marker show elevation information in a tooltip, or just be a visual indicator?
2. What visual style best distinguishes the hover marker from route point markers?
3. Should hovering the elevation graph also highlight the corresponding segment on the map route?
4. Do we need to handle the case where multiple direction chunks exist (routes > 25 waypoints)?
5. Should the elevation chart show a vertical reference line at the hovered point?