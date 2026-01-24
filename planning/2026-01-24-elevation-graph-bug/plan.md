# Elevation Graph Bug Fix - Implementation Plan

## Overview

Fix the elevation graph bug where the graph skips the start or middle sections of a route. The root cause is that `generateElevationData()` silently drops data points when `queryTerrainElevation()` returns null, creating gaps in the X-axis.

## Current State Analysis

The elevation graph is generated in `components/map.tsx` by three tightly-coupled functions:
- `generateElevationData()` (lines 150-195) - samples route at 30m intervals
- `interpolatePointAtDistance()` (lines 198-236) - finds coordinates at specific distances
- `calculateDistance()` (lines 239-251) - Haversine distance calculation

**The bug** (lines 181-187):
```typescript
if (elevation !== null && elevation !== undefined) {
  profileData.push({...});  // Point is SKIPPED if elevation is null
}
```

When terrain data is unavailable for a sample point, the point is dropped entirely, causing:
- Graph not starting at distance 0
- Large gaps between consecutive points

### Key Discoveries:
- Functions are not exported and cannot be unit tested in isolation
- `lib/elevation/slope.ts` provides a good pattern for extracted elevation utilities
- Test infrastructure uses Vitest with happy-dom environment

## Desired End State

1. Elevation graph always starts at distance 0 (or very close)
2. No large gaps between consecutive data points
3. Missing elevations are interpolated from neighboring known values
4. Pure functions are extracted to `lib/elevation/elevation-data.ts` with comprehensive tests
5. All tests pass: `pnpm test`

## What We're NOT Doing

- Changing the 30m sample interval
- Fixing multi-segment route handling (only `directions[0]` is used) - separate issue
- Adding spatial indexing for `findNearestElevationPoint()` - performance optimization for later
- Handling the case where ALL elevations are null (edge case, would need UI indication)

## Implementation Approach

1. Extract pure functions to a testable module
2. Write tests that reproduce the bug (tests should fail initially)
3. Implement interpolation logic for missing elevations
4. Verify tests pass
5. Update `map.tsx` to use the extracted functions

---

## Phase 1: Extract Pure Functions

### Overview
Move `interpolatePointAtDistance()` and `calculateDistance()` to a new module. Create a new `generateElevationPoints()` function that accepts an elevation getter, making it testable without Mapbox.

### Changes Required:

#### 1. Create `lib/elevation/elevation-data.ts`

**File**: `lib/elevation/elevation-data.ts`

```typescript
/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 - First coordinate [lng, lat]
 * @param coord2 - Second coordinate [lng, lat]
 * @returns Distance in kilometers
 */
export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[1] * Math.PI) / 180) *
      Math.cos((coord2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolate a point at a specific distance along a route
 * @param coordinates - Array of [lng, lat] coordinates
 * @param targetDistanceMeters - Distance from start in meters
 * @returns Interpolated coordinate or null if coordinates are invalid
 */
export function interpolatePointAtDistance(
  coordinates: [number, number][],
  targetDistanceMeters: number
): [number, number] | null {
  if (coordinates.length < 2) return null;

  if (targetDistanceMeters <= 0) {
    return coordinates[0];
  }

  let cumulativeDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const segmentDistance = calculateDistance(coordinates[i], coordinates[i + 1]) * 1000;

    if (targetDistanceMeters <= cumulativeDistance + segmentDistance) {
      const remainingDistance = targetDistanceMeters - cumulativeDistance;

      if (segmentDistance < 0.001) {
        return coordinates[i];
      }

      const ratio = remainingDistance / segmentDistance;
      const lng = coordinates[i][0] + (coordinates[i + 1][0] - coordinates[i][0]) * ratio;
      const lat = coordinates[i][1] + (coordinates[i + 1][1] - coordinates[i][1]) * ratio;

      return [lng, lat];
    }

    cumulativeDistance += segmentDistance;
  }

  return coordinates[coordinates.length - 1];
}

export interface ElevationPoint {
  distance: number;        // Distance in km
  elevation: number;       // Elevation in meters
  coordinate: [number, number];
  interpolated?: boolean;  // True if elevation was interpolated
}

/**
 * Generate elevation points along a route, interpolating missing values
 * @param coordinates - Route coordinates [lng, lat][]
 * @param totalDistanceMeters - Total route distance in meters
 * @param sampleIntervalMeters - Distance between samples in meters
 * @param getElevation - Function to get elevation for a coordinate (may return null)
 * @returns Array of elevation points with no gaps
 */
export function generateElevationPoints(
  coordinates: [number, number][],
  totalDistanceMeters: number,
  sampleIntervalMeters: number,
  getElevation: (coord: [number, number]) => number | null | undefined
): ElevationPoint[] {
  if (coordinates.length < 2 || totalDistanceMeters <= 0) {
    return [];
  }

  const numSamples = Math.floor(totalDistanceMeters / sampleIntervalMeters) + 1;

  // First pass: collect all points with known and unknown elevations
  const rawPoints: Array<{
    distance: number;
    elevation: number | null;
    coordinate: [number, number];
  }> = [];

  for (let i = 0; i < numSamples; i++) {
    const targetDistanceMeters = i * sampleIntervalMeters;
    const interpolatedPoint = interpolatePointAtDistance(coordinates, targetDistanceMeters);

    if (interpolatedPoint) {
      const elevation = getElevation(interpolatedPoint);
      rawPoints.push({
        distance: targetDistanceMeters / 1000,
        elevation: elevation ?? null,
        coordinate: interpolatedPoint,
      });
    }
  }

  // Second pass: interpolate missing elevations
  return interpolateMissingElevations(rawPoints);
}

/**
 * Interpolate missing elevation values from neighboring known values
 * Uses linear interpolation between nearest known points
 */
function interpolateMissingElevations(
  points: Array<{ distance: number; elevation: number | null; coordinate: [number, number] }>
): ElevationPoint[] {
  if (points.length === 0) return [];

  const result: ElevationPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    if (point.elevation !== null) {
      result.push({
        distance: point.distance,
        elevation: point.elevation,
        coordinate: point.coordinate,
        interpolated: false,
      });
    } else {
      // Find nearest known elevations before and after
      const before = findNearestKnownElevation(points, i, -1);
      const after = findNearestKnownElevation(points, i, 1);

      let interpolatedElevation: number;

      if (before !== null && after !== null) {
        // Linear interpolation between before and after
        const ratio = (point.distance - before.distance) / (after.distance - before.distance);
        interpolatedElevation = before.elevation + (after.elevation - before.elevation) * ratio;
      } else if (before !== null) {
        // Use previous known elevation
        interpolatedElevation = before.elevation;
      } else if (after !== null) {
        // Use next known elevation
        interpolatedElevation = after.elevation;
      } else {
        // No known elevations at all - use 0 as fallback
        interpolatedElevation = 0;
      }

      result.push({
        distance: point.distance,
        elevation: interpolatedElevation,
        coordinate: point.coordinate,
        interpolated: true,
      });
    }
  }

  return result;
}

/**
 * Find the nearest point with a known elevation in the given direction
 */
function findNearestKnownElevation(
  points: Array<{ distance: number; elevation: number | null }>,
  startIndex: number,
  direction: -1 | 1
): { distance: number; elevation: number } | null {
  let i = startIndex + direction;

  while (i >= 0 && i < points.length) {
    if (points[i].elevation !== null) {
      return { distance: points[i].distance, elevation: points[i].elevation };
    }
    i += direction;
  }

  return null;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] File exists: `lib/elevation/elevation-data.ts`
- [ ] TypeScript compiles without errors: `pnpm build`
- [ ] Linting passes: `pnpm lint`

---

## Phase 2: Write Tests

### Overview
Create comprehensive tests for the extracted functions. Include tests that would have caught the original bug (gap detection tests).

### Changes Required:

#### 1. Create `lib/elevation/elevation-data.test.ts`

**File**: `lib/elevation/elevation-data.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  interpolatePointAtDistance,
  generateElevationPoints,
} from './elevation-data'

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const coord: [number, number] = [10.7522, 59.9139]
    expect(calculateDistance(coord, coord)).toBe(0)
  })

  it('calculates correct distance for known points', () => {
    // Oslo to Stockholm is approximately 417 km
    const oslo: [number, number] = [10.7522, 59.9139]
    const stockholm: [number, number] = [18.0686, 59.3293]
    const distance = calculateDistance(oslo, stockholm)
    expect(distance).toBeGreaterThan(400)
    expect(distance).toBeLessThan(450)
  })

  it('handles coordinates crossing meridian', () => {
    const west: [number, number] = [-1, 51]
    const east: [number, number] = [1, 51]
    expect(calculateDistance(west, east)).toBeGreaterThan(0)
  })
})

describe('interpolatePointAtDistance', () => {
  const simpleRoute: [number, number][] = [
    [0, 0],
    [0.01, 0],   // ~1.1 km east
    [0.02, 0],   // ~2.2 km east
  ]

  it('returns null for empty coordinates', () => {
    expect(interpolatePointAtDistance([], 100)).toBeNull()
  })

  it('returns null for single coordinate', () => {
    expect(interpolatePointAtDistance([[0, 0]], 100)).toBeNull()
  })

  it('returns first coordinate at distance 0', () => {
    const result = interpolatePointAtDistance(simpleRoute, 0)
    expect(result).toEqual([0, 0])
  })

  it('returns first coordinate for negative distance', () => {
    const result = interpolatePointAtDistance(simpleRoute, -100)
    expect(result).toEqual([0, 0])
  })

  it('returns last coordinate when distance exceeds route length', () => {
    const result = interpolatePointAtDistance(simpleRoute, 1000000)
    expect(result).toEqual([0.02, 0])
  })

  it('interpolates point in middle of segment', () => {
    const result = interpolatePointAtDistance(simpleRoute, 555) // ~half of first segment
    expect(result).not.toBeNull()
    expect(result![0]).toBeGreaterThan(0)
    expect(result![0]).toBeLessThan(0.01)
  })

  it('handles very short segments', () => {
    const shortRoute: [number, number][] = [
      [0, 0],
      [0.000001, 0], // Very short segment
      [0.01, 0],
    ]
    const result = interpolatePointAtDistance(shortRoute, 0.05)
    expect(result).not.toBeNull()
  })
})

describe('generateElevationPoints', () => {
  // Simple straight route for testing
  const coordinates: [number, number][] = [
    [0, 0],
    [0.009, 0], // ~1 km east
  ]
  const totalDistance = 1000 // 1 km in meters
  const sampleInterval = 100 // Sample every 100m

  describe('basic functionality', () => {
    it('returns empty array for insufficient coordinates', () => {
      expect(generateElevationPoints([], 1000, 100, () => 100)).toEqual([])
      expect(generateElevationPoints([[0, 0]], 1000, 100, () => 100)).toEqual([])
    })

    it('returns empty array for zero distance', () => {
      expect(generateElevationPoints(coordinates, 0, 100, () => 100)).toEqual([])
    })

    it('generates correct number of samples', () => {
      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        () => 100
      )
      // 1000m / 100m + 1 = 11 samples (0, 100, 200, ..., 1000)
      expect(result.length).toBe(11)
    })

    it('first point has distance 0', () => {
      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        () => 100
      )
      expect(result[0].distance).toBe(0)
    })
  })

  describe('gap prevention (bug fix verification)', () => {
    it('includes point at distance 0 even when elevation is null', () => {
      // This test would have caught the original bug
      const getElevation = (coord: [number, number]) => {
        // Return null for first point
        if (coord[0] === 0 && coord[1] === 0) return null
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      expect(result[0].distance).toBe(0)
      expect(result[0].interpolated).toBe(true)
    })

    it('has no gaps larger than sample interval', () => {
      const getElevation = () => 100

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      for (let i = 1; i < result.length; i++) {
        const gap = result[i].distance - result[i - 1].distance
        expect(gap).toBeLessThanOrEqual(0.15) // 150m tolerance (interval is 100m = 0.1km)
      }
    })

    it('handles null elevation in middle without creating gap', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        // Return null for 5th sample (middle of route)
        if (callCount === 5) return null
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // Should still have all 11 points
      expect(result.length).toBe(11)

      // Check no large gaps
      for (let i = 1; i < result.length; i++) {
        const gap = result[i].distance - result[i - 1].distance
        expect(gap).toBeLessThanOrEqual(0.15)
      }
    })

    it('handles consecutive null elevations', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        // Return null for samples 3, 4, 5
        if (callCount >= 3 && callCount <= 5) return null
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      expect(result.length).toBe(11)
      // Interpolated points should be marked
      expect(result[2].interpolated).toBe(true)
      expect(result[3].interpolated).toBe(true)
      expect(result[4].interpolated).toBe(true)
    })
  })

  describe('elevation interpolation', () => {
    it('interpolates missing elevation from neighbors', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        if (callCount === 3) return null  // Third point is missing
        if (callCount <= 2) return 100    // First two at 100m
        return 200                         // Rest at 200m
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // Third point should be interpolated between 100 and 200
      expect(result[2].elevation).toBeGreaterThan(100)
      expect(result[2].elevation).toBeLessThan(200)
      expect(result[2].interpolated).toBe(true)
    })

    it('uses previous elevation when no following elevation exists', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        if (callCount >= 10) return null  // Last two points missing
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // Last points should use previous known elevation
      expect(result[9].elevation).toBe(100)
      expect(result[10].elevation).toBe(100)
    })

    it('uses next elevation when no previous elevation exists', () => {
      let callCount = 0
      const getElevation = () => {
        callCount++
        if (callCount <= 2) return null  // First two points missing
        return 100
      }

      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        getElevation
      )

      // First points should use next known elevation
      expect(result[0].elevation).toBe(100)
      expect(result[1].elevation).toBe(100)
    })

    it('falls back to 0 when all elevations are null', () => {
      const result = generateElevationPoints(
        coordinates,
        totalDistance,
        sampleInterval,
        () => null
      )

      expect(result.length).toBe(11)
      result.forEach(point => {
        expect(point.elevation).toBe(0)
        expect(point.interpolated).toBe(true)
      })
    })
  })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] File exists: `lib/elevation/elevation-data.test.ts`
- [ ] All tests pass: `pnpm test`

---

## Phase 3: Update Map Component

### Overview
Update `components/map.tsx` to use the extracted functions from `lib/elevation/elevation-data.ts`.

### Changes Required:

#### 1. Update imports in `components/map.tsx`

Add import at top of file:
```typescript
import {
  generateElevationPoints,
  calculateDistance,
  ElevationPoint,
} from "@/lib/elevation/elevation-data";
```

#### 2. Replace `generateElevationData` function

Replace lines 150-195 with:
```typescript
function generateElevationData(
  mapRef: MapRef | null,
  directions: Array<Directions>,
): ElevationPoint[] {
  if (!mapRef || !directions || directions.length < 1) {
    return [];
  }

  const route = directions[0].routes[0];
  const coordinates = route.geometry.coordinates;
  const totalDistanceMeters = route.distance;
  const sampleIntervalMeters = 30;

  return generateElevationPoints(
    coordinates,
    totalDistanceMeters,
    sampleIntervalMeters,
    (coord) => mapRef.queryTerrainElevation(coord)
  );
}
```

#### 3. Remove old helper functions

Delete the following functions from `map.tsx` (they're now in `elevation-data.ts`):
- `interpolatePointAtDistance` (lines 198-236)
- `calculateDistance` (lines 239-251)

#### 4. Update `findNearestElevationPoint` to use imported `calculateDistance`

The `findNearestElevationPoint` function uses `calculateDistance`. After removing the local definition, it will use the imported one.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `pnpm build`
- [ ] Linting passes: `pnpm lint`
- [ ] All tests pass: `pnpm test`

#### Manual Verification:
- [ ] Start dev server: `pnpm dev`
- [ ] Create a route with multiple waypoints
- [ ] Verify elevation graph starts at distance 0
- [ ] Verify no large gaps in the elevation graph
- [ ] Verify hovering over the graph still highlights the correct map location

---

## Phase 4: Update Type Definitions

### Overview
Update the elevation state type to use the new `ElevationPoint` interface with the optional `interpolated` field.

### Changes Required:

#### 1. Update `MapContainerProps` interface in `map.tsx`

The `setElevation` prop type should be updated if we want to expose the `interpolated` field to parent components. However, since the existing type `Array<{ distance: number; elevation: number; coordinate: [number, number] }>` is a subset of `ElevationPoint`, this should work without changes.

If we want to show interpolated points differently in the UI later, we can update the type then.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `pnpm build`

---

## Testing Strategy

### Unit Tests:
- `calculateDistance`: Known distances, edge cases (same point, meridian crossing)
- `interpolatePointAtDistance`: Empty input, single point, boundary conditions, interpolation accuracy
- `generateElevationPoints`: Gap detection, interpolation correctness, edge cases

### Integration Tests:
The existing `ElevationProfile` component tests in `components/widgets/elevation-profile.test.tsx` should continue to pass.

### Manual Testing Steps:
1. Create a new route in the application
2. Observe that the elevation graph starts at 0 km
3. Create a long route (5+ km) and verify no visible gaps
4. Hover over the elevation graph and verify the map marker moves correctly
5. Test in an area where terrain data might be sparse (ocean, remote areas)

## Performance Considerations

The interpolation adds a second pass over the data, but since we typically have ~33 samples per km (at 30m intervals), even a 100km route only has ~3300 samples. This is negligible performance impact.

## References

- Research document: `planning/2026-01-24-elevation-graph-bug/research.md`
- Existing slope utilities: `lib/elevation/slope.ts`
- Existing slope tests: `lib/elevation/slope.test.ts`
