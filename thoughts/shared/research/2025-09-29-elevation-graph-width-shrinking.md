---
date: 2025-09-29T19:18:55+0000
researcher: Claude
git_commit: 8f7c1c4e52d6de3ad4b7f4249f1b453a8d97543d
branch: main
repository: soneto
topic: "Elevation graph shrinking at 1km intervals"
tags: [research, codebase, elevation-profile, recharts, bug]
status: complete
last_updated: 2025-09-29
last_updated_by: Claude
---

# Research: Elevation Graph Shrinking at 1km Intervals

**Date**: 2025-09-29T19:18:55+0000
**Researcher**: Claude
**Git Commit**: 8f7c1c4e52d6de3ad4b7f4249f1b453a8d97543d
**Branch**: main
**Repository**: soneto

## Research Question

Why does the elevation graph width shrink when the route distance reaches 1km, 2km, etc., instead of maintaining full width?

## Summary

The elevation graph shrinks at kilometer boundaries due to the XAxis `domain` prop being set to `[0, Math.ceil(maxDistance)]`. When the route crosses a kilometer threshold (e.g., from 0.9km to 1.1km), the domain suddenly expands from `[0, 1]` to `[0, 2]`, causing the existing data to be compressed to approximately half the chart width. The ResponsiveContainer maintains constant pixel width, but it now represents a larger distance range.

**Root cause**: `components/elevation-profile.tsx:44` - `domain={[0, Math.ceil(maxDistance)]}`

**Solution**: Remove the `domain` prop or use `domain={['auto', 'auto']}` to allow Recharts to automatically scale the chart to fit the data at full width.

## Detailed Findings

### Component Implementation

The elevation profile is implemented in `components/elevation-profile.tsx` using the Recharts library (v3.0.2).

**Key configuration** (`elevation-profile.tsx:25-46`):
```typescript
// Calculate custom ticks for whole kilometers
const maxDistance = Math.max(...chartData.map((point) => point.distance));
const customTicks = [];
for (let i = 0; i <= Math.ceil(maxDistance); i++) {
  if (i <= maxDistance) {
    customTicks.push(i);
  }
}

<XAxis
  dataKey="distance"
  axisLine={false}
  tickLine={false}
  tick={{ fontSize: 10, fill: "#666" }}
  ticks={customTicks}
  domain={[0, Math.ceil(maxDistance)]}  // ⚠️ PROBLEM LINE
  type="number"
  tickFormatter={(value) => `${value}km`}
/>
```

### The Shrinking Mechanism

1. **Domain calculation** uses `Math.ceil(maxDistance)` which rounds up to the next whole kilometer
2. **Visual effect at boundaries**:
   - At 0.99km: domain is `[0, 1]`, data fills ~99% of width
   - At 1.00km: domain is `[0, 1]`, data fills 100% of width
   - At 1.01km: domain becomes `[0, 2]`, data fills only ~50% of width ⚠️

3. **Why this happens**:
   - The ResponsiveContainer has fixed pixel width (determined by parent container)
   - The X-axis domain defines the data range to display
   - When domain doubles from 1 to 2, the same amount of data occupies half the visual space
   - This creates a sudden "shrinking" appearance

### Data Flow

**Elevation data generation** (`components/map.tsx:117-158`):
- Samples taken every 30 meters along route
- Uses `mapRef.queryTerrainElevation()` to get Mapbox terrain data
- Converts distance from meters to kilometers
- Returns: `Array<{ distance: number; elevation: number; coordinate: [number, number] }>`

**Component hierarchy**:
1. `app/page.tsx` - manages state
2. `components/map.tsx` - generates elevation data
3. `components/capabilities-panel.tsx` - displays panel with fixed height (`h-40`)
4. `components/elevation-profile.tsx` - renders the chart

## Code References

- `components/elevation-profile.tsx:44` - XAxis domain configuration (root cause)
- `components/elevation-profile.tsx:26` - maxDistance calculation
- `components/elevation-profile.tsx:36` - ResponsiveContainer with 100% width
- `components/map.tsx:117-158` - elevation data generation
- `components/capabilities-panel.tsx:258-277` - elevation profile container

## Architecture Insights

**Recharts XAxis Domain Behavior**:
- `type="number"` creates a continuous numerical scale
- `domain={[min, max]}` explicitly defines axis boundaries
- Data points are positioned proportionally within the domain range
- Without `domain` prop, Recharts auto-scales to fit all data at full width
- With fixed domain, expanding the range compresses the data visually

**Current implementation rationale** (inferred):
- Custom ticks array ensures whole kilometer labels
- Domain ceiling likely intended to show "nice" boundaries
- However, this creates the unwanted shrinking behavior

## Solutions

### Option 1: Remove domain prop (Recommended)
Remove the `domain` prop entirely to let Recharts auto-scale:

```typescript
<XAxis
  dataKey="distance"
  type="number"
  ticks={customTicks}
  tickFormatter={(value) => `${value}km`}
  // domain removed
/>
```

### Option 2: Use auto domain
Explicitly use auto-scaling:

```typescript
<XAxis
  dataKey="distance"
  type="number"
  domain={['auto', 'auto']}
  ticks={customTicks}
  tickFormatter={(value) => `${value}km`}
/>
```

### Option 3: Use dataMin/dataMax
Scale to actual data boundaries:

```typescript
<XAxis
  dataKey="distance"
  type="number"
  domain={[0, 'dataMax']}
  ticks={customTicks}
  tickFormatter={(value) => `${value}km`}
/>
```

All three options will maintain full-width chart rendering regardless of route distance.

## Related Research

None found - this is the first research document in this codebase.

## Open Questions

1. Was the `domain={[0, Math.ceil(maxDistance)]}` intentionally added for a specific reason?
2. Should the custom ticks calculation also be adjusted after removing the domain?
3. The `totalDistance` prop (line 8) is passed but never used - is it needed?