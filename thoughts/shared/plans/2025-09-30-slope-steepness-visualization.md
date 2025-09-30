---
date: 2025-09-30
git_commit: da05a48df8fdee81a21202882c1307aaa3dbb878
branch: main
repository: soneto
topic: "Slope steepness visualization for elevation graphs using ReferenceArea overlays"
tags: [plan, elevation-profile, recharts, visualization, slope, gradient]
status: ready
related_research: thoughts/shared/research/2025-09-30-slope-steepness-visualization-techniques.md
---

# Slope Steepness Visualization Implementation Plan

## Overview

Implement visual indication of steep uphill sections in the elevation profile graph using Recharts' ReferenceArea overlays with color-coded highlighting based on slope steepness.

## Current State Analysis

The elevation profile is implemented in `components/elevation-profile.tsx` using Recharts:
- Displays elevation as an Area chart with bidirectional hover interaction with the map
- Samples elevation data every 30 meters along the route (generated in `components/map.tsx:148-189`)
- Data structure: `Array<{ distance: number, elevation: number, coordinate: [number, number] }>`
- Currently shows a uniform blue gradient for all elevation sections

### Key Constraint:
Recharts v3.0.2 does not support conditional coloring of a single Area component based on data values. The chosen solution uses ReferenceArea overlays to highlight steep sections.

## Desired End State

The elevation profile will:
1. Visually highlight uphill sections where slope ≥ 6% using colored overlays
2. Use heat map color scheme: yellow (6-9%), orange (10-14%), red (15%+)
3. Filter out steep segments shorter than 30m to reduce visual clutter
4. Maintain existing hover interaction functionality

### Verification:
- Create a test route with varied slopes (flat, gentle, moderate, steep sections)
- Steep uphill sections should display colored overlays matching their steepness
- Hovering over the graph should still sync with map marker
- No performance degradation for routes up to 100km

## What We're NOT Doing

- Not highlighting downhill sections (only uphill)
- Not adding text labels showing grade percentage on segments
- Not enhancing tooltip with slope information (can be added later)
- Not highlighting slopes below 6% (gentle/flat sections)
- Not making threshold or colors configurable (hardcoded for simplicity)

## Implementation Approach

Create utility functions for slope calculation and steep segment detection, then integrate ReferenceArea components into the existing ElevationProfile component using React's useMemo for performance.

## Phase 1: Create Slope Calculation Utilities

### Overview
Add utility functions for calculating slope and determining color based on steepness thresholds.

### Changes Required:

#### 1. Create Slope Utilities File
**File**: `lib/elevation/slope.ts`
**Changes**: Create new file with slope calculation and color utilities

```typescript
/**
 * Calculate slope percentage between two elevation data points
 * @param point1 - First point with distance (km) and elevation (m)
 * @param point2 - Second point with distance (km) and elevation (m)
 * @returns Slope percentage (positive for uphill, negative for downhill)
 */
export function calculateSlope(
  point1: { distance: number; elevation: number },
  point2: { distance: number; elevation: number }
): number {
  const elevationChange = point2.elevation - point1.elevation; // rise (meters)
  const distanceChange = (point2.distance - point1.distance) * 1000; // run (meters)

  if (distanceChange === 0) return 0;

  return (elevationChange / distanceChange) * 100;
}

/**
 * Get color for slope percentage based on steepness thresholds
 * Heat map style: yellow → orange → red for increasing steepness
 * @param slope - Slope percentage
 * @returns Hex color code or null if below threshold
 */
export function getSlopeColor(slope: number): string | null {
  // Only highlight uphill sections
  if (slope < 6) return null;
  if (slope < 10) return "#fbbf24"; // yellow: moderate (6-9%)
  if (slope < 15) return "#f97316"; // orange: steep (10-14%)
  return "#dc2626"; // red: very steep (15%+)
}

/**
 * Get opacity for slope visualization overlays
 * @param slope - Slope percentage
 * @returns Opacity value 0-1
 */
export function getSlopeOpacity(slope: number): number {
  if (slope < 6) return 0;
  if (slope < 10) return 0.25;
  if (slope < 15) return 0.35;
  return 0.45;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `pnpm build`
- [x] No linting errors: `pnpm lint`

#### Manual Verification:
- [x] Utility functions exist at `lib/elevation/slope.ts`
- [x] Functions have correct TypeScript types
- [x] Color thresholds match specification (6%, 10%, 15%)

---

## Phase 2: Create Steep Segment Detection

### Overview
Implement function to analyze elevation data and identify continuous steep uphill segments, filtering out segments shorter than 30m.

### Changes Required:

#### 1. Add Segment Detection Function
**File**: `lib/elevation/slope.ts`
**Changes**: Add function to find steep segments

```typescript
export interface SteepSegment {
  x1: number; // Start distance (km)
  x2: number; // End distance (km)
  avgSlope: number; // Average slope percentage
  maxSlope: number; // Maximum slope percentage in segment
}

/**
 * Identify steep uphill segments in elevation data
 * Filters out segments shorter than minimum length
 * @param elevationData - Array of elevation data points
 * @param threshold - Minimum slope percentage to be considered steep (default: 6%)
 * @param minLengthKm - Minimum segment length in km to include (default: 0.03km = 30m)
 * @returns Array of steep uphill segments
 */
export function findSteepSegments(
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>,
  threshold: number = 6,
  minLengthKm: number = 0.03
): SteepSegment[] {
  if (elevationData.length < 2) return [];

  const segments: SteepSegment[] = [];
  let currentSegment: {
    x1: number;
    slopes: number[];
  } | null = null;

  for (let i = 1; i < elevationData.length; i++) {
    const slope = calculateSlope(elevationData[i - 1], elevationData[i]);

    // Only consider uphill sections that meet threshold
    if (slope >= threshold) {
      if (!currentSegment) {
        // Start new segment
        currentSegment = {
          x1: elevationData[i - 1].distance,
          slopes: [slope],
        };
      } else {
        // Continue current segment
        currentSegment.slopes.push(slope);
      }
    } else {
      if (currentSegment) {
        // End current segment
        const x2 = elevationData[i - 1].distance;
        const segmentLength = x2 - currentSegment.x1;

        // Only add segment if it meets minimum length requirement
        if (segmentLength >= minLengthKm) {
          segments.push({
            x1: currentSegment.x1,
            x2,
            avgSlope:
              currentSegment.slopes.reduce((a, b) => a + b) / currentSegment.slopes.length,
            maxSlope: Math.max(...currentSegment.slopes),
          });
        }

        currentSegment = null;
      }
    }
  }

  // Close final segment if exists and meets minimum length
  if (currentSegment) {
    const x2 = elevationData[elevationData.length - 1].distance;
    const segmentLength = x2 - currentSegment.x1;

    if (segmentLength >= minLengthKm) {
      segments.push({
        x1: currentSegment.x1,
        x2,
        avgSlope: currentSegment.slopes.reduce((a, b) => a + b) / currentSegment.slopes.length,
        maxSlope: Math.max(...currentSegment.slopes),
      });
    }
  }

  return segments;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `pnpm build`
- [x] No linting errors: `pnpm lint`

#### Manual Verification:
- [x] Function correctly identifies steep segments from sample elevation data
- [x] Segments shorter than 30m are filtered out
- [x] Only uphill segments (positive slope) are detected
- [x] Average and max slope calculations are correct

---

## Phase 3: Integrate ReferenceArea Overlays

### Overview
Update the ElevationProfile component to calculate steep segments and render ReferenceArea overlays with appropriate colors.

### Changes Required:

#### 1. Update ElevationProfile Component
**File**: `components/elevation-profile.tsx`
**Changes**: Import utilities, calculate steep segments, render ReferenceArea overlays

Add imports at the top:
```typescript
import {
  Area,
  AreaChart,
  ReferenceArea, // ADD THIS
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react"; // ADD THIS
import { findSteepSegments, getSlopeColor, getSlopeOpacity } from "@/lib/elevation/slope"; // ADD THIS
```

Add steep segment calculation after chartData definition (around line 29):
```typescript
  // Calculate steep segments for visualization
  const steepSegments = useMemo(
    () => findSteepSegments(elevationData, 6, 0.03),
    [elevationData]
  );
```

Add ReferenceArea overlays in the AreaChart component, after the Area component and before the ReferenceDot (around line 113):
```typescript
          <Area
            dataKey="elevation"
            fill="#8884d8"
            fillOpacity={0.3}
            stroke="#8884d8"
            strokeWidth={2}
          />

          {/* Steep segment overlays */}
          {steepSegments.map((segment, index) => {
            const color = getSlopeColor(segment.avgSlope);
            if (!color) return null;

            return (
              <ReferenceArea
                key={`steep-${index}`}
                x1={segment.x1}
                x2={segment.x2}
                fill={color}
                fillOpacity={getSlopeOpacity(segment.avgSlope)}
                stroke={color}
                strokeOpacity={0.8}
                strokeWidth={1}
              />
            );
          })}

          {/* Hover indicator dot */}
          {hoveredIndex !== null && chartData[hoveredIndex] && (
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `pnpm build`
- [x] No linting errors: `pnpm lint`
- [x] Development server runs without errors: `pnpm dev`

#### Manual Verification:
- [ ] Create a test route with varied terrain (flat, gentle hills, steep climbs)
- [ ] Steep uphill sections (≥6%) display colored overlays
- [ ] Color coding is correct:
  - Yellow for 6-9% slopes
  - Orange for 10-14% slopes
  - Red for 15%+ slopes
- [ ] Short steep segments (<30m) are not highlighted
- [ ] Downhill sections are not highlighted (only uphill)
- [ ] Hover interaction still works correctly (purple dot and elevation display)
- [ ] Map marker syncs with graph hover
- [ ] No visual glitches or performance issues with long routes

---

## Testing Strategy

### Manual Testing Steps:

1. **Test with varied terrain route**:
   - Create a route with multiple markers that goes through flat, gentle, and steep terrain
   - Verify color overlays appear on steep sections
   - Check that colors match steepness (yellow → orange → red)

2. **Test minimum segment length filter**:
   - Create a route with short steep sections (<30m)
   - Verify these short segments are NOT highlighted

3. **Test hover interaction**:
   - Hover over elevation graph
   - Verify purple dot appears
   - Verify elevation value displays in top-right corner
   - Verify map marker appears at correct location

4. **Test with long route**:
   - Create a route longer than 50km with multiple steep sections
   - Verify no performance degradation
   - Verify all steep segments are highlighted correctly

5. **Test downhill sections**:
   - Create a route with downhill sections
   - Verify downhill sections are NOT highlighted (only uphill)

6. **Edge cases**:
   - Test with route having no steep sections (all flat)
   - Test with route that is entirely steep
   - Test with very short route (< 1km)

### Expected Results:
- Steep uphill sections are visually distinct with appropriate color coding
- UI remains responsive with no lag
- Existing functionality (hover, bidirectional sync) works as before
- No console errors or warnings

## Performance Considerations

- `useMemo` is used to calculate steep segments only when elevation data changes
- Minimum segment length filter (30m) reduces number of ReferenceArea components rendered
- For typical routes (10-50km), expect 5-15 steep segments maximum
- ReferenceArea is a lightweight Recharts component with minimal performance impact

## References

- Research document: `thoughts/shared/research/2025-09-30-slope-steepness-visualization-techniques.md`
- Current elevation profile: `components/elevation-profile.tsx`
- Elevation data generation: `components/map.tsx:148-189`
- Recharts documentation: https://recharts.org/en-US/api/ReferenceArea

## Next Steps After Implementation

Potential future enhancements (out of scope for this plan):
1. Add grade percentage to hover tooltip
2. Add toggle to show/hide slope overlays
3. Add legend explaining color coding
4. Make thresholds and colors configurable
5. Add text labels for very steep sections (>15%)
6. Highlight downhill sections with different color scheme
