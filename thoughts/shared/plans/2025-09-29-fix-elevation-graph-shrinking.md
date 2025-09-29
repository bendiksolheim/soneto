---
date: 2025-09-29
ticket: none
status: draft
author: Claude
tags: [bug-fix, elevation-profile, recharts]
---

# Fix Elevation Graph Width Shrinking Implementation Plan

## Overview

Fix the elevation graph shrinking bug that occurs when route distance crosses kilometer boundaries (1km, 2km, etc.). The chart should maintain full width at all times.

## Current State Analysis

The elevation profile component (`components/elevation-profile.tsx`) uses Recharts with an XAxis `domain` prop set to `[0, Math.ceil(maxDistance)]`. This causes the graph to suddenly compress when crossing kilometer thresholds.

### Key Discovery:
- **Root cause**: `components/elevation-profile.tsx:44` - `domain={[0, Math.ceil(maxDistance)]}`
- **Behavior**: When route grows from 0.99km to 1.01km, domain expands from `[0, 1]` to `[0, 2]`, compressing data to ~50% width
- **Research**: Full analysis in `thoughts/shared/research/2025-09-29-elevation-graph-width-shrinking.md`

## Desired End State

The elevation graph maintains full chart width regardless of route distance. When the route crosses kilometer boundaries, the chart smoothly expands without visual compression.

**Verification**: Add a marker at 0.99km, then add another at 1.01km. The graph should maintain full width without shrinking.

## What We're NOT Doing

- Not changing the custom ticks logic (whole kilometer labels are correct)
- Not modifying elevation data sampling (30m intervals is fine)
- Not changing the ResponsiveContainer or chart dimensions
- Not removing the unused `totalDistance` prop (separate cleanup task)

## Implementation Approach

Remove the explicit domain constraint to allow Recharts to auto-scale the chart to fit all data at full width. The custom ticks will still show whole kilometer labels, but the domain will automatically adjust to the actual data range.

## Phase 1: Fix XAxis Domain

### Overview
Remove the `domain` prop from XAxis to enable auto-scaling behavior.

### Changes Required:

#### 1. Elevation Profile Component
**File**: `components/elevation-profile.tsx`
**Changes**: Remove line 44 (`domain={[0, Math.ceil(maxDistance)]}`) from XAxis configuration

```tsx
<XAxis
  dataKey="distance"
  axisLine={false}
  tickLine={false}
  tick={{ fontSize: 10, fill: "#666" }}
  ticks={customTicks}
  type="number"
  tickFormatter={(value) => `${value}km`}
/>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `tsc`
- [x] Linting passes: `npm run lint`
- [ ] Development server runs without errors: `npm run dev`

#### Manual Verification:
- [ ] Create a route with distance < 1km - graph fills full width
- [ ] Extend route to exactly 1.00km - graph still fills full width
- [ ] Extend route past 1km (e.g., 1.2km) - graph maintains full width without shrinking
- [ ] Test at 2km boundary - no shrinking occurs
- [ ] **REQUIRED**: Verify X-axis tick labels show ONLY whole kilometers (0km, 1km, 2km, etc.) - no decimal values
- [ ] **REQUIRED**: Verify no tick labels appear between whole kilometers (e.g., no 0.5km, 1.5km labels)
- [ ] Verify tooltip still shows accurate distance and elevation values

## Testing Strategy

### Manual Testing Steps:
1. Start with empty map
2. Add markers to create ~0.8km route - verify graph fills width and shows only "0km" tick
3. Add marker to reach ~1.1km - **verify no shrinking occurs** and ticks show "0km" and "1km" only
4. Continue to ~2.1km - verify smooth scaling and ticks show "0km", "1km", "2km" only
5. Remove markers back below 1km - verify smooth transition and ticks return to whole kilometers only
6. Test with very short route (~0.1km) - verify graph renders correctly with "0km" tick only
7. **Critical**: Verify at all distances that X-axis ticks are ONLY whole kilometers with no decimal values

## Performance Considerations

No performance impact. Recharts auto-scaling is the default behavior and is highly optimized.

## References

- Research document: `thoughts/shared/research/2025-09-29-elevation-graph-width-shrinking.md`
- Affected component: `components/elevation-profile.tsx:44`
- Recharts documentation: https://recharts.org/en-US/api/XAxis