---
date: 2026-01-24T23:30:00+01:00
researcher: Claude
git_commit: da35438a9fadcaea990b801dae0876c0e0271b91
branch: main
repository: soneto
topic: "Elevation Graph Bug - Reproduction Test with Real Route Data"
tags: [research, codebase, elevation-profile, bug-reproduction, testing]
status: complete
last_updated: 2026-01-24
last_updated_by: Claude
---

# Research: Elevation Graph Bug - Reproduction Test

**Date**: 2026-01-24T23:30:00+01:00
**Researcher**: Claude
**Git Commit**: da35438a9fadcaea990b801dae0876c0e0271b91
**Branch**: main
**Repository**: soneto

## Research Question

Create a test case using real route coordinates that reproduces the elevation graph bug where the graph starts at 2.43km instead of 0km.

## Summary

I've created a test suite in `lib/elevation/elevation-data.test.ts` that uses the user's actual route coordinates to verify the bug. The tests demonstrate that:

1. The extracted `generateElevationPoints()` function in `lib/elevation/elevation-data.ts` correctly handles null elevations by interpolating
2. The bug exists in `components/map.tsx` which **does not use** the extracted function and still skips points when elevation is null

## Bug Analysis

### Root Cause

The `generateElevationData()` function in `components/map.tsx:150-195` contains the bug:

```typescript
// map.tsx:181-187 - THE BUG
if (elevation !== null && elevation !== undefined) {
  profileData.push({
    distance: targetDistanceMeters / 1000,
    elevation: elevation,
    coordinate: interpolatedPoint,
  });
}
// Points with null elevation are SKIPPED entirely
```

When `mapRef.queryTerrainElevation()` returns null for the first 2.43km of the route (likely due to terrain tiles not being loaded yet), those data points are simply omitted from the result array.

### The Fix Already Exists

A correct implementation exists in `lib/elevation/elevation-data.ts`:

```typescript
export function generateElevationPoints(
  coordinates: [number, number][],
  totalDistanceMeters: number,
  sampleIntervalMeters: number,
  getElevation: (coord: [number, number]) => number | null | undefined
): ElevationPoint[]
```

This function:
1. Collects all sample points (with null or valid elevation)
2. Interpolates missing elevations from neighboring known values
3. Returns a complete array with no gaps

**However, `map.tsx` is NOT using this function.**

## Test Cases Created

Added to `lib/elevation/elevation-data.test.ts`:

### 1. Bug Reproduction Test
```typescript
it('should include data from the start of the route even when elevation API returns null for early points')
```
- Uses actual route coordinates from user report
- Simulates null returns for first 2.43km
- Verifies first data point is at distance 0

### 2. No Large Gaps Test
```typescript
it('should have no large gaps in elevation data even when API returns null for sections')
```
- Simulates sparse elevation data (every other point null)
- Verifies maximum gap is ≤ sample interval

### 3. Sample Count Test
```typescript
it('should produce the expected number of sample points regardless of null elevations')
```
- All elevations return null
- Verifies correct number of points still generated

## Route Data Used

Coordinates from Trondheim area, Norway:

| # | Latitude | Longitude |
|---|----------|-----------|
| 1 | 63.38370992584808 | 10.319276667304678 |
| 2 | 63.38307018737481 | 10.319015907507833 |
| 3 | 63.384345281012 | 10.322364927156201 |
| 4 | 63.3841196712975 | 10.323324530533881 |
| 5 | 63.38509903006249 | 10.328605294025607 |
| 6 | 63.38673930656657 | 10.330886948887496 |
| 7 | 63.38826344557381 | 10.33134029242197 |
| 8 | 63.38830113122086 | 10.336417188684692 |
| 9 | 63.39021764804971 | 10.346235608003752 |
| 10 | 63.393700180240245 | 10.349495296535963 |
| 11 | 63.39654384441371 | 10.353613611655675 |
| 12 | 63.39903380182554 | 10.357813115579944 |

## Recommended Fix

Replace the inline `generateElevationData()` function in `map.tsx` with the properly working `generateElevationPoints()` from `lib/elevation/elevation-data.ts`:

```typescript
// In map.tsx, import and use:
import { generateElevationPoints } from '@/lib/elevation/elevation-data'

// In useEffect:
const data = generateElevationPoints(
  directions[0].routes[0].geometry.coordinates,
  directions[0].routes[0].distance,
  30, // sample interval in meters
  (coord) => mapRef.current?.queryTerrainElevation(coord) ?? null
)
```

## Code References

- `lib/elevation/elevation-data.test.ts` - Test file with bug reproduction tests
- `lib/elevation/elevation-data.ts` - Correct implementation (not being used)
- `components/map.tsx:150-195` - Buggy `generateElevationData()` function
- `components/map.tsx:181-187` - Specific bug location (skips null elevations)

## To Run Tests

```bash
pnpm test lib/elevation/elevation-data.test.ts
```

## Open Questions

1. Why was `lib/elevation/elevation-data.ts` created but never integrated into `map.tsx`?
2. Should terrain tiles be pre-loaded before generating elevation data?
3. Is there a timing issue where elevation is queried before terrain tiles are loaded?
