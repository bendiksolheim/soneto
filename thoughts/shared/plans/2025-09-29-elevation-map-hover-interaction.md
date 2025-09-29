# Interactive Hover Connection Between Elevation Graph and Map Route - Implementation Plan

## Overview

Implement bidirectional hover interaction between the elevation graph and map route, allowing users to see their location on the map when hovering over the elevation graph, and vice versa. This feature provides visual feedback connecting the two views for better route understanding.

## Current State Analysis

**Existing Implementation:**
- Elevation data structure includes coordinates: `Array<{ distance: number; elevation: number; coordinate: [number, number] }>` (app/page.tsx:20-22)
- ElevationProfile component uses Recharts AreaChart with tooltip but no external event handling (components/elevation-profile.tsx:34-84)
- Map route rendered via Source/Layer with no hover interaction (components/map/route.tsx:14-16)
- RouteMarker component provides styling patterns for markers (components/map/route-marker.tsx:1-62)
- State management centralized in app/page.tsx (app/page.tsx:15-108)
- Elevation data sampled every 30 meters (components/map.tsx:130)

**Key Constraints:**
- Desktop-only implementation (no mobile/touch support required)
- Must maintain existing color scheme and design patterns
- Data flows: Map → HomePage → CapabilitiesPanel → ElevationProfile
- Controlled component pattern with state lifting

## Desired End State

Users can hover over the elevation graph to see a marker at the corresponding location on the map, and hover over the route on the map to see a highlighted dot with elevation information on the graph.

### Verification:
- [ ] Hovering elevation graph shows marker on map at correct coordinate (implementation complete, needs manual testing)
- [ ] Hovering map route shows dot on elevation graph at correct distance (implementation complete, needs manual testing)
- [ ] Elevation value displayed when hovering graph dot (implementation complete, needs manual testing)
- [ ] Smooth transitions when moving between hover states (implementation complete, needs manual testing)
- [ ] No performance issues with routes up to 100km (implementation complete, needs manual testing)
- [ ] Hover state clears when mouse leaves both components (implementation complete, needs manual testing)

## What We're NOT Doing

- Mobile/touch support for hover interactions
- Highlighting route segments on the map
- Synchronized tooltip content between map and graph
- Animations for marker appearance/disappearance
- Debouncing/throttling hover events (unless performance requires it)
- Handling multiple direction chunks (routes > 25 waypoints) - will only use first chunk

## Implementation Approach

Use index-based coordination between components. When hovering either the graph or map, store the hovered elevation data index in parent state, then use that index to:
1. Calculate map coordinate: `elevation[index].coordinate`
2. Highlight graph position using Recharts ReferenceDot at the data point

This approach is efficient and avoids complex coordinate matching logic.

---

## Phase 1: State Management & Component Props

### Overview
Set up the state management infrastructure to coordinate hover state between Map and ElevationProfile components.

### Changes Required:

#### 1. Main Page State
**File**: `app/page.tsx`

Add hover state after elevation state (line 22):
```typescript
const [hoveredElevationIndex, setHoveredElevationIndex] = useState<number | null>(null);
```

Pass hover callbacks to Map component (update lines 55-62):
```typescript
<Map
  mapboxToken={mapboxToken}
  routePoints={routePoints}
  setRoutePoints={setRoutePoints}
  directions={directions}
  setElevation={setElevation}
  sidebarOpen={sidebarOpen}
  hoveredElevationIndex={hoveredElevationIndex}
  onElevationHover={setHoveredElevationIndex}
/>
```

Pass hover callbacks to CapabilitiesPanel (update lines 70-87):
```typescript
<CapabilitiesPanel
  routePoints={routePoints}
  distance={distance}
  elevationData={elevation}
  paceInSeconds={paceInSeconds}
  onPaceChange={setPace}
  routes={routes}
  onRouteLoad={handleRouteLoad}
  deleteRoute={deleteRoute}
  onSaveRoute={(name) => {
    saveRoute({ name, points: routePoints });
  }}
  onExportGPX={() => {
    const geojson = directionsToGeoJson(directions);
    exportGpx(geojson);
  }}
  onResetRoute={handleClearRoute}
  hoveredElevationIndex={hoveredElevationIndex}
  onElevationHover={setHoveredElevationIndex}
/>
```

#### 2. Map Component Interface
**File**: `components/map.tsx`

Update MapContainerProps interface (lines 18-27):
```typescript
interface MapContainerProps {
  mapboxToken: string;
  routePoints: Array<Point>;
  setRoutePoints: (points: Array<Point>) => void;
  directions: Array<Directions>;
  setElevation: (
    elevation: Array<{ distance: number; elevation: number; coordinate: [number, number] }>,
  ) => void;
  sidebarOpen?: boolean;
  hoveredElevationIndex: number | null;
  onElevationHover: (index: number | null) => void;
}
```

Update component props destructuring (lines 29-36):
```typescript
export function Map({
  mapboxToken,
  routePoints,
  setRoutePoints,
  directions,
  setElevation,
  sidebarOpen = false,
  hoveredElevationIndex,
  onElevationHover,
}: MapContainerProps) {
```

#### 3. CapabilitiesPanel Interface
**File**: `components/capabilities-panel.tsx`

Update CapabilitiesPanelProps interface (lines 31-50):
```typescript
interface CapabilitiesPanelProps {
  // Route data
  routePoints: Array<Point>;
  distance: number;
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;

  // Pace controls
  paceInSeconds: number;
  onPaceChange: (pace: number) => void;

  // Route management
  routes: RouteWithCalculatedData[];
  onRouteLoad: (routePoints: Array<Point>, routeName: string) => void;
  deleteRoute: (id: string) => Promise<boolean>;

  // Actions
  onSaveRoute: (name: string) => void;
  onExportGPX: () => void;
  onResetRoute: () => void;

  // Hover interaction
  hoveredElevationIndex: number | null;
  onElevationHover: (index: number | null) => void;
}
```

Update component props destructuring (lines 52-65):
```typescript
export function CapabilitiesPanel(props: CapabilitiesPanelProps) {
  const {
    routePoints,
    distance,
    elevationData,
    paceInSeconds,
    onPaceChange,
    routes,
    onRouteLoad,
    deleteRoute,
    onSaveRoute,
    onExportGPX,
    onResetRoute,
    hoveredElevationIndex,
    onElevationHover,
  } = props;
```

Pass to ElevationProfile (update lines 265-269):
```typescript
<ElevationProfile
  elevationData={elevationData}
  totalDistance={distance}
  isVisible={true}
  hoveredIndex={hoveredElevationIndex}
  onHover={onElevationHover}
/>
```

#### 4. ElevationProfile Interface
**File**: `components/elevation-profile.tsx`

Update ElevationProfileProps interface (lines 6-10):
```typescript
interface ElevationProfileProps {
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  totalDistance: number;
  isVisible: boolean;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}
```

Update component props destructuring (lines 12-13):
```typescript
export function ElevationProfile(props: ElevationProfileProps): JSX.Element {
  const { elevationData, isVisible, hoveredIndex, onHover } = props;
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm build`
- [x] No linting errors: `pnpm lint`
- [x] Application runs without errors: `pnpm dev`

#### Manual Verification:
- [x] Application loads and displays correctly
- [x] No console errors or warnings
- [x] Existing functionality still works (route planning, elevation display)

---

## Phase 2: Graph → Map Hover

### Overview
Implement hover detection on the elevation graph and render a marker at the corresponding location on the map.

### Changes Required:

#### 1. Add Recharts Hover Handlers
**File**: `components/elevation-profile.tsx`

Import ReferenceDot (update line 4):
```typescript
import { Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
```

Add hover handlers to AreaChart (update lines 37-79):
```typescript
<AreaChart
  margin={{ top: 5, right: 0, left: 0, bottom: 20 }}
  data={chartData}
  onMouseMove={(state) => {
    if (state && state.isTooltipActive && state.activeTooltipIndex !== undefined) {
      onHover(state.activeTooltipIndex);
    }
  }}
  onMouseLeave={() => {
    onHover(null);
  }}
>
```

#### 2. Create HoverMarker Component
**File**: `components/map/hover-marker.tsx` (new file)

```typescript
import { Marker } from "react-map-gl/mapbox";

type HoverMarkerProps = {
  coordinate: [number, number]; // [longitude, latitude]
};

export function HoverMarker(props: HoverMarkerProps): JSX.Element {
  const { coordinate } = props;

  return (
    <Marker
      longitude={coordinate[0]}
      latitude={coordinate[1]}
      anchor="center"
    >
      <div className="relative pointer-events-none">
        {/* Outer pulse ring */}
        <div className="absolute inset-0 w-5 h-5 -translate-x-1/2 -translate-y-1/2">
          <div className="w-full h-full rounded-full bg-purple-500 opacity-30 animate-ping" />
        </div>

        {/* Main marker dot */}
        <div className="relative w-3 h-3 -translate-x-1/2 -translate-y-1/2">
          <div className="w-full h-full rounded-full bg-purple-600 border-2 border-white shadow-lg" />
        </div>
      </div>
    </Marker>
  );
}
```

#### 3. Render HoverMarker in Map
**File**: `components/map.tsx`

Import HoverMarker (add to line 14):
```typescript
import { HoverMarker } from "./map/hover-marker";
```

Calculate hover coordinate and add useState for elevation data storage (after line 37):
```typescript
const [elevationData, setElevationDataState] = useState<
  Array<{ distance: number; elevation: number; coordinate: [number, number] }>
>([]);

// Query elevation for route points and generate elevation profile
useEffect(() => {
  const data = generateElevationData(mapRef.current, directions);
  setElevationDataState(data);
  setElevation(data);
}, [directions, setElevation]);

const hoveredCoordinate =
  hoveredElevationIndex !== null && elevationData[hoveredElevationIndex]
    ? elevationData[hoveredElevationIndex].coordinate
    : null;
```

Note: Remove the old useEffect at lines 40-43 since we're replacing it above.

Render HoverMarker before closing MapboxMap tag (after line 93):
```typescript
      {hoveredCoordinate && <HoverMarker coordinate={hoveredCoordinate} />}
    </MapboxMap>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm build`
- [x] No linting errors: `pnpm lint`
- [x] Application runs without errors: `pnpm dev`

#### Manual Verification:
- [ ] Hovering over elevation graph shows purple marker on map
- [ ] Marker follows mouse movement along the graph smoothly
- [ ] Marker disappears when mouse leaves the graph
- [ ] Marker appears at the correct geographic location
- [ ] Marker is visually distinct from route point markers

---

## Phase 3: Map → Graph Hover

### Overview
Implement hover detection on the map route and highlight the corresponding point on the elevation graph with elevation value.

### Changes Required:

#### 1. Add Utility Function for Nearest Point
**File**: `components/map.tsx`

Add function after calculateDistance (around line 214):
```typescript
// Find the nearest elevation data point to a given coordinate
function findNearestElevationPoint(
  lngLat: { lng: number; lat: number },
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>,
): number | null {
  if (elevationData.length === 0) return null;

  let nearestIndex = 0;
  let minDistance = Number.MAX_VALUE;

  for (let i = 0; i < elevationData.length; i++) {
    const [lng, lat] = elevationData[i].coordinate;
    const distance = calculateDistance([lng, lat], [lngLat.lng, lngLat.lat]);

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  // Only return if within reasonable proximity (100 meters)
  return minDistance < 0.1 ? nearestIndex : null;
}
```

#### 2. Add Map Hover Handlers
**File**: `components/map.tsx`

Add hover handler to MapboxMap (update line 62):
```typescript
<MapboxMap
  ref={mapRef}
  mapboxAccessToken={mapboxToken}
  mapStyle="mapbox://styles/mapbox/streets-v12"
  initialViewState={{
    latitude: 59.9139,
    longitude: 10.7522,
    zoom: 3,
  }}
  maxZoom={20}
  minZoom={3}
  onClick={onClick}
  terrain={{ source: "terrain-source", exaggeration: 0.5 }}
  padding={sidebarOpen ? { left: 384 } : undefined}
  onMouseMove={(e: MapMouseEvent) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ['route-layer'],
    });

    if (features.length > 0) {
      const nearestIndex = findNearestElevationPoint(e.lngLat, elevationData);
      if (nearestIndex !== null) {
        onElevationHover(nearestIndex);
      }
    } else if (hoveredElevationIndex !== null) {
      // Clear hover if not over route
      onElevationHover(null);
    }
  }}
  interactiveLayerIds={['route-layer']}
>
```

#### 3. Update Route Layer ID
**File**: `components/map/route.tsx`

Update layer id to match the one referenced in hover handler (line 20):
```typescript
const style: Omit<LineLayerSpecification, "source"> = {
  id: "route-layer",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#ef4444",
    "line-width": 4,
    "line-opacity": 0.8,
  },
};
```

#### 4. Add ReferenceDot to Elevation Graph
**File**: `components/elevation-profile.tsx`

Add ReferenceDot inside AreaChart, after the Area component (around line 79):
```typescript
          <Area
            dataKey="elevation"
            fill="#8884d8"
            fillOpacity={0.3}
            stroke="#8884d8"
            strokeWidth={2}
          />

          {/* Hover indicator dot */}
          {hoveredIndex !== null && chartData[hoveredIndex] && (
            <ReferenceDot
              x={chartData[hoveredIndex].distance}
              y={chartData[hoveredIndex].elevation}
              r={6}
              fill="#8b5cf6"
              stroke="#ffffff"
              strokeWidth={2}
              isFront={true}
            />
          )}
        </AreaChart>
```

#### 5. Add Elevation Label on Hover
**File**: `components/elevation-profile.tsx`

Add label display above the chart (update around line 34):
```typescript
return (
  <div className="w-full h-full relative">
    {hoveredIndex !== null && chartData[hoveredIndex] && (
      <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
        {chartData[hoveredIndex].elevation}m
      </div>
    )}
    <ResponsiveContainer width="100%" height="100%">
```

Close the new wrapper div at the end (line 82):
```typescript
      </ResponsiveContainer>
    </div>
  );
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm build`
- [x] No linting errors: `pnpm lint`
- [x] Application runs without errors: `pnpm dev`

#### Manual Verification:
- [ ] Hovering over map route shows purple dot on elevation graph
- [ ] Dot appears at correct distance along the graph
- [ ] Elevation value displays in top-right corner of graph
- [ ] Dot and label disappear when mouse leaves route
- [ ] Hover detection works along entire route length
- [ ] Cursor position on map corresponds to graph position

---

## Phase 4: Polish & Testing

### Overview
Ensure smooth bidirectional interaction and test edge cases.

### Changes Required:

#### 1. Prevent Hover Conflict
**File**: `components/elevation-profile.tsx`

Ensure graph hover doesn't trigger when hovering from map (update onMouseMove handler):
```typescript
onMouseMove={(state) => {
  if (state && state.isTooltipActive && state.activeTooltipIndex !== undefined) {
    // Only update if the index actually changed to avoid conflicts
    if (hoveredIndex !== state.activeTooltipIndex) {
      onHover(state.activeTooltipIndex);
    }
  }
}}
```

#### 2. Performance Check
**File**: `components/map.tsx`

Add comment documenting performance considerations:
```typescript
// Note: Hover performance is acceptable with current 30m sampling.
// If routes exceed 100km and performance degrades, consider:
// 1. Throttling onMouseMove events
// 2. Increasing sample interval for very long routes
// 3. Using spatial indexing for nearest point lookup
```

### Testing Scenarios:

#### Test Case 1: Basic Interaction
- [ ] Create a short route (5-10km)
- [ ] Hover over elevation graph → marker appears on map
- [ ] Hover over map route → dot appears on graph with elevation
- [ ] Move mouse smoothly along both → interaction is smooth

#### Test Case 2: Edge Cases
- [ ] No route points → no errors, no interaction
- [ ] Single route point → elevation graph empty, no errors
- [ ] Two points creating minimal route → hover works correctly
- [ ] Very start/end of route → hover works at extremes

#### Test Case 3: Long Routes
- [ ] Create route >50km with many waypoints
- [ ] Test hover performance on both graph and map
- [ ] Verify accuracy at various distances along route
- [ ] Check that nearest point detection works correctly

#### Test Case 4: State Transitions
- [ ] Hover graph → hover map → both should work together
- [ ] Hover then delete route → no errors
- [ ] Hover then load saved route → hover state clears properly
- [ ] Hover with sidebar open → hover with sidebar closed

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm build`
- [x] No linting errors: `pnpm lint`
- [x] Application runs without errors: `pnpm dev`

#### Manual Verification:
- [ ] All test cases pass
- [ ] No console errors during interaction
- [ ] Hover feels responsive and smooth
- [ ] Visual feedback is clear and consistent
- [ ] No memory leaks with extended hover usage
- [ ] Works correctly after route modifications

---

## Testing Strategy

### Unit Tests (Optional - Not Required)
If time permits, consider adding tests for:
- `findNearestElevationPoint()` function with various coordinate inputs
- Edge cases: empty arrays, single points, coincident points

### Integration Tests (Manual)
1. **Graph → Map**:
   - Hover at start, middle, end of elevation graph
   - Verify marker appears at correct map coordinates
   - Check marker style matches design

2. **Map → Graph**:
   - Hover along various parts of the route line
   - Verify dot appears at correct distance on graph
   - Check elevation value matches tooltip

3. **Bidirectional**:
   - Hover graph, then immediately hover map
   - Verify smooth transition without flickering
   - Check state consistency

### Manual Testing Checklist:
1. Create new route with 3-4 waypoints
2. Hover elevation graph from left to right slowly
3. Verify purple marker follows on map
4. Hover map route from start to end
5. Verify purple dot and elevation label appear on graph
6. Test rapid mouse movements
7. Test mouse leaving and re-entering components
8. Save and load route, test hover still works
9. Test with sidebar open and closed
10. Test route deletion while hovering

---

## Performance Considerations

**Current Performance Profile:**
- 30-meter sampling provides ~333 data points per 10km route
- Linear search in `findNearestElevationPoint()` is O(n) but acceptable for typical route lengths
- Recharts handles hover events efficiently without throttling

**Optimization Strategies (if needed):**
1. Throttle `onMouseMove` events to 60fps (16ms)
2. Use memoization for hover coordinate calculations
3. Implement spatial indexing (e.g., grid-based) for routes >100km
4. Increase sampling interval for very long routes

---

## Migration Notes

No data migration required. This is a pure UI enhancement with no backend or storage changes.

---

## References

- Original research: `thoughts/shared/research/2025-09-29-elevation-map-hover-interaction.md`
- Recharts documentation: https://recharts.org/en-US/api
- Mapbox GL JS Events: https://docs.mapbox.com/mapbox-gl-js/api/map/#map-events
- Current elevation generation: `components/map.tsx:117-158`
- Current graph implementation: `components/elevation-profile.tsx:34-84`
- Route rendering: `components/map/route.tsx:14-16`