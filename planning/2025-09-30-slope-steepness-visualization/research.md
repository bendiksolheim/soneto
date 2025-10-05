---
date: 2025-09-30T19:08:32+0000
researcher: Claude
git_commit: da05a48df8fdee81a21202882c1307aaa3dbb878
branch: main
repository: soneto
topic: "Slope steepness visualization techniques for elevation graphs"
tags: [research, elevation-profile, recharts, visualization, slope, gradient, ux]
status: complete
last_updated: 2025-09-30
last_updated_by: Claude
---

# Research: Slope Steepness Visualization Techniques for Elevation Graphs

**Date**: 2025-09-30T19:08:32+0000
**Researcher**: Claude
**Git Commit**: da05a48df8fdee81a21202882c1307aaa3dbb878
**Branch**: main
**Repository**: soneto

## Research Question

What are the best techniques for visualizing slope steepness in elevation graphs, specifically what's possible with the Recharts library (v3.0.2) used in this project?

## Summary

There are four main approaches for visualizing slope steepness in elevation profiles:

1. **Color gradient approaches** - Using SVG linearGradient to color the area chart based on slope intensity
2. **Segment-based visualization** - Using multiple ReferenceArea components to highlight steep sections
3. **Overlay information** - Adding grade percentage as text or secondary chart data
4. **Interactive enhancements** - Showing grade on hover in tooltips

**Key finding for Recharts**: Native Recharts does not support conditional coloring of a single Area component based on data values. However, there are several viable workarounds using SVG gradients, multiple ReferenceArea overlays, or splitting data into multiple Area components.

## Detailed Findings

### 1. Color Gradient Approaches

#### How Major Applications Do It

**Komoot** (simplest approach):
- Green color for flat sections (< 2% grade)
- Red color for steep sections
- Darker shades indicate steeper gradients
- Simple and intuitive for quick visual scanning

**Plot-a-Route** (directional system):
- Red sections: uphill
- Green sections: downhill
- Yellow sections: flat (< 2% gradient)
- Darker shades = steeper gradients

**RideWithGPS** (data-rich approach):
- Toggle between elevation and grade views
- Overlays speed, heart rate, power, cadence data
- Interactive chart with detailed grade information at any point

#### Color Coding Standards for Slope Percentage

Based on cycling/running trail standards:

- **0-2%**: Flat (Yellow/Green) - Barely noticeable
- **3-5%**: Gentle (Light Green/Light Orange) - Easy climbing
- **6-9%**: Moderate (Orange) - Sustained effort required
- **10-15%**: Steep (Dark Orange/Red) - Challenging climbing
- **15%+**: Very Steep (Dark Red) - Expert level difficulty

These percentages align with mountain biking trail grading systems:
- Green Circle (Level 1): Max 6° (11%), average 3° (5%)
- Blue Square: Moderate slopes
- Black Diamond: Steep terrain
- Double Black Diamond: Expert-only extreme slopes

#### Calculating Slope Percentage

**Formula**: `Slope % = (Rise ÷ Run) × 100`

Where:
- **Rise** = vertical elevation change (meters)
- **Run** = horizontal distance (meters)

**Example**: Climbing 50m over 1000m = (50/1000) × 100 = 5% grade

**Implementation for elevation data**:
```javascript
function calculateSlope(point1, point2) {
  const elevationChange = point2.elevation - point1.elevation; // rise (meters)
  const distanceChange = (point2.distance - point1.distance) * 1000; // run (meters, converted from km)
  return (elevationChange / distanceChange) * 100;
}
```

**Considerations**:
- For GPS/elevation data with inherent inaccuracies, using rise/hypotenuse instead of rise/run is acceptable
- Calculate slope between consecutive data points in the elevation array
- May need smoothing/averaging to reduce noise from GPS inaccuracies
- Current project samples every 30 meters, providing good resolution for slope calculation

### 2. SVG Gradient Techniques

#### Basic LinearGradient in Recharts

Recharts (and all SVG-based charting libraries) support SVG linearGradient definitions. This is the primary method for adding color variation to Area charts.

**Simple vertical gradient** (current implementation uses this):
```jsx
<defs>
  <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#8884d8" stopOpacity={0.8}/>
    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
  </linearGradient>
</defs>
<Area dataKey="elevation" fill="url(#colorElevation)" />
```

**Multiple color stops for elevation zones**:
```jsx
<linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="#ff0000" stopOpacity={0.8}/> {/* High elevation: red */}
  <stop offset="33%" stopColor="#ffaa00" stopOpacity={0.6}/> {/* Mid elevation: orange */}
  <stop offset="66%" stopColor="#ffff00" stopOpacity={0.4}/> {/* Low-mid elevation: yellow */}
  <stop offset="100%" stopColor="#00ff00" stopOpacity={0.2}/> {/* Low elevation: green */}
</linearGradient>
```

**Limitations**:
- Standard linearGradient runs in a fixed direction (vertical or horizontal)
- Cannot dynamically change based on data values at different points
- Colors the entire area uniformly rather than by segment

#### Dynamic Gradients Based on Data

**Approach 1: Calculate gradient stops from data**

```javascript
// Calculate gradient stops based on elevation range
const minElevation = Math.min(...chartData.map(d => d.elevation));
const maxElevation = Math.max(...chartData.map(d => d.elevation));

// Create stops at elevation thresholds
const stops = [
  { offset: '0%', color: '#dc2626' },      // Highest: red
  { offset: '25%', color: '#f97316' },     // High: orange
  { offset: '50%', color: '#fbbf24' },     // Medium: yellow
  { offset: '75%', color: '#84cc16' },     // Low: lime
  { offset: '100%', color: '#22c55e' }     // Lowest: green
];

<linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
  {stops.map(stop => (
    <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={0.6}/>
  ))}
</linearGradient>
```

**Approach 2: Horizontal gradient for distance-based coloring**

```jsx
<linearGradient id="slopeGradient" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stopColor="#22c55e" />    {/* Start: green */}
  <stop offset="50%" stopColor="#f97316" />   {/* Middle: orange */}
  <stop offset="100%" stopColor="#dc2626" />  {/* End: red */}
</linearGradient>
```

This creates a left-to-right gradient, but still doesn't respond to actual slope values.

**Key limitation**: Neither approach allows the gradient to change based on actual slope values at specific points along the route. The gradient is always linear/smooth across the entire chart.

### 3. Segment-Based Visualization with ReferenceArea

#### What is ReferenceArea?

Recharts' ReferenceArea component highlights specific rectangular regions on a chart. It's designed for marking zones, ranges, or periods of interest.

**Basic usage**:
```jsx
<AreaChart data={chartData}>
  <Area dataKey="elevation" />
  <ReferenceArea
    x1={2}      // Start distance (km)
    x2={3}      // End distance (km)
    fill="red"
    fillOpacity={0.3}
    label="Steep climb"
  />
</AreaChart>
```

#### Dynamic Steep Segment Highlighting

**Approach**: Calculate slope for each segment, create ReferenceArea overlays for steep sections

```javascript
// Calculate steep segments from elevation data
function findSteepSegments(elevationData, steepnessThreshold = 8) {
  const steepSegments = [];
  let currentSegment = null;

  for (let i = 1; i < elevationData.length; i++) {
    const slope = calculateSlope(elevationData[i - 1], elevationData[i]);

    if (Math.abs(slope) >= steepnessThreshold) {
      if (!currentSegment) {
        // Start new steep segment
        currentSegment = {
          x1: elevationData[i - 1].distance,
          slope: slope
        };
      }
    } else {
      if (currentSegment) {
        // End current steep segment
        currentSegment.x2 = elevationData[i - 1].distance;
        steepSegments.push(currentSegment);
        currentSegment = null;
      }
    }
  }

  // Close final segment if needed
  if (currentSegment) {
    currentSegment.x2 = elevationData[elevationData.length - 1].distance;
    steepSegments.push(currentSegment);
  }

  return steepSegments;
}

// Usage in component
const steepSegments = findSteepSegments(elevationData, 8); // 8% threshold

<AreaChart data={chartData}>
  <Area dataKey="elevation" fill="#8884d8" stroke="#8884d8" />

  {/* Overlay ReferenceAreas for steep sections */}
  {steepSegments.map((segment, index) => (
    <ReferenceArea
      key={index}
      x1={segment.x1}
      x2={segment.x2}
      fill={segment.slope > 0 ? "#dc2626" : "#2563eb"} // Red for uphill, blue for downhill
      fillOpacity={0.3}
      strokeOpacity={0.8}
      stroke={segment.slope > 0 ? "#dc2626" : "#2563eb"}
    />
  ))}
</AreaChart>
```

**Color coding for different steepness levels**:
```javascript
function getSlopeColor(slope) {
  const absSlope = Math.abs(slope);
  if (absSlope < 3) return null; // Don't highlight gentle slopes
  if (absSlope < 6) return "#fbbf24"; // Yellow: moderate
  if (absSlope < 10) return "#f97316"; // Orange: steep
  return "#dc2626"; // Red: very steep
}

{steepSegments.map((segment, index) => {
  const color = getSlopeColor(segment.slope);
  if (!color) return null;

  return (
    <ReferenceArea
      key={index}
      x1={segment.x1}
      x2={segment.x2}
      fill={color}
      fillOpacity={0.25}
    />
  );
})}
```

**Pros**:
- Works natively with Recharts
- Can color different segments with different colors
- Can add labels to segments
- Flexible and customizable
- Good for highlighting specific zones (e.g., "steep climbs")

**Cons**:
- Adds many DOM elements if route has many steep segments
- Rectangular overlays don't follow the elevation line smoothly
- May clutter the visualization with too many overlays
- Performance impact with 100+ segments

### 4. Multiple Area Components Approach

#### Concept

Split the elevation data into multiple datasets based on slope thresholds, render separate Area components for each.

```javascript
// Categorize each data point by slope
function categorizeBySlope(elevationData) {
  const categories = {
    flat: [],
    moderate: [],
    steep: [],
    verySteep: []
  };

  for (let i = 0; i < elevationData.length; i++) {
    const point = elevationData[i];

    if (i === 0) {
      categories.flat.push(point);
      continue;
    }

    const slope = calculateSlope(elevationData[i - 1], point);
    const absSlope = Math.abs(slope);

    // Categorize and add to appropriate dataset
    if (absSlope < 3) {
      categories.flat.push(point);
      categories.moderate.push({ ...point, elevation: null });
      categories.steep.push({ ...point, elevation: null });
      categories.verySteep.push({ ...point, elevation: null });
    } else if (absSlope < 6) {
      categories.flat.push({ ...point, elevation: null });
      categories.moderate.push(point);
      categories.steep.push({ ...point, elevation: null });
      categories.verySteep.push({ ...point, elevation: null });
    } else if (absSlope < 10) {
      categories.flat.push({ ...point, elevation: null });
      categories.moderate.push({ ...point, elevation: null });
      categories.steep.push(point);
      categories.verySteep.push({ ...point, elevation: null });
    } else {
      categories.flat.push({ ...point, elevation: null });
      categories.moderate.push({ ...point, elevation: null });
      categories.steep.push({ ...point, elevation: null });
      categories.verySteep.push(point);
    }
  }

  return categories;
}

// Render
const slopeCategories = categorizeBySlope(elevationData);

<AreaChart data={chartData}>
  <Area dataKey="elevation" data={slopeCategories.flat} fill="#22c55e" fillOpacity={0.6} />
  <Area dataKey="elevation" data={slopeCategories.moderate} fill="#fbbf24" fillOpacity={0.6} />
  <Area dataKey="elevation" data={slopeCategories.steep} fill="#f97316" fillOpacity={0.6} />
  <Area dataKey="elevation" data={slopeCategories.verySteep} fill="#dc2626" fillOpacity={0.6} />
</AreaChart>
```

**Pros**:
- Provides true segment-by-segment coloring
- Follows the elevation line smoothly
- Native Recharts components

**Cons**:
- Complex data preparation
- Requires null values for gaps, which may cause rendering issues
- Discontinuous segments may not render smoothly
- Animation/transition issues between segments
- Not well documented in Recharts
- Community reports this approach as "not very readable"

### 5. Overlay Information Approaches

#### Grade Percentage on Hover (Currently Implemented)

The current implementation shows elevation on hover. This can be extended to show slope:

```jsx
<Tooltip
  content={({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const index = chartData.findIndex(d => d.distance === label);
    const slope = index > 0 ? calculateSlope(elevationData[index - 1], elevationData[index]) : 0;

    return (
      <div className="bg-white rounded-lg shadow-lg p-2 border">
        <p className="text-xs">Distance: {label}km</p>
        <p className="text-xs">Elevation: {payload[0].value}m</p>
        <p className="text-xs font-semibold">
          Grade: {slope > 0 ? '+' : ''}{slope.toFixed(1)}%
        </p>
      </div>
    );
  }}
/>
```

**Enhancement**: Add visual indicator of slope severity in tooltip:
```jsx
<p className="text-xs font-semibold" style={{
  color: getSlopeColor(slope)
}}>
  Grade: {slope > 0 ? '+' : ''}{slope.toFixed(1)}%
</p>
```

#### Secondary Line Chart for Grade

Add a second Y-axis showing grade percentage as a line:

```jsx
<ComposedChart data={chartDataWithSlope}>
  {/* Elevation area */}
  <Area yAxisId="left" dataKey="elevation" fill="#8884d8" stroke="#8884d8" />

  {/* Grade line */}
  <Line yAxisId="right" dataKey="grade" stroke="#dc2626" dot={false} strokeWidth={2} />

  <YAxis yAxisId="left" orientation="left" />
  <YAxis yAxisId="right" orientation="right" label={{ value: 'Grade %', angle: 90 }} />
</ComposedChart>
```

**Pros**:
- Shows exact grade values
- Easy to see grade trends
- Can identify steep sections quickly
- Uses native Recharts components

**Cons**:
- Requires more vertical space
- Two Y-axes can be confusing
- May clutter the visualization
- Grade line can obscure elevation data

#### Text Labels for Steep Segments

Add text labels showing grade percentage on steep sections:

```jsx
{steepSegments.map((segment, index) => (
  <ReferenceArea
    key={index}
    x1={segment.x1}
    x2={segment.x2}
    fill="#dc2626"
    fillOpacity={0.2}
    label={{
      value: `${segment.slope.toFixed(1)}%`,
      position: 'top',
      fontSize: 10,
      fill: '#dc2626'
    }}
  />
))}
```

### 6. What Recharts Supports (v3.0.2)

Based on research and the project's current implementation:

**Native Support**:
- ✅ SVG linearGradient definitions in `<defs>`
- ✅ ReferenceArea for highlighting rectangular zones
- ✅ ReferenceLine for vertical/horizontal lines
- ✅ ReferenceDot for marking specific points (already used for hover indicator)
- ✅ ComposedChart for combining multiple chart types
- ✅ Multiple Area components in one chart
- ✅ Custom tooltip content with any data/calculations
- ✅ Customizable colors via props

**Not Natively Supported**:
- ❌ Conditional coloring of a single Area based on data values
- ❌ Gradient that follows data values (only direction-based gradients)
- ❌ Per-segment stroke/fill colors in a single Area component
- ❌ Easy API for "color zones" based on data thresholds

**Workarounds Available**:
- ✓ Multiple ReferenceArea overlays (recommended approach)
- ✓ Multiple Area components with split data (complex, not recommended)
- ✓ SVG gradients with creative use of stops
- ✓ Custom shape rendering (advanced, undocumented)

### 7. Accessibility Considerations

**Color Blindness**:
- Use ColorBrewer palettes designed for accessibility
- Test with colorblind simulation tools (WebAIM's Contrast Checker)
- Don't rely solely on color to convey information
- Add patterns or textures in addition to colors

**Contrast Requirements**:
- Ensure sufficient contrast between gradient colors (WCAG AA: 4.5:1)
- Use high-contrast elevation breaks with distinct luminance values
- Avoid light text on bright gradients, or dark text on dark gradients

**Multi-Sensory Approaches**:
- Combine color with patterns (cross-hatching, stippling)
- Add text labels for steep sections
- Provide grade percentage in hover tooltips
- Use icons or symbols to indicate slope direction (↗ uphill, ↘ downhill)

**Recommended Color Schemes for Slope Visualization**:

**Scheme 1: Uphill Intensity (Single Hue)**
- 0-2%: `#dcfce7` (light green)
- 3-5%: `#86efac` (green)
- 6-9%: `#22c55e` (emerald)
- 10-15%: `#16a34a` (dark green)
- 15%+: `#15803d` (very dark green)

**Scheme 2: Heat Map (Multi-Hue)**
- 0-2%: `#22c55e` (green) - flat/easy
- 3-5%: `#84cc16` (lime) - gentle
- 6-9%: `#fbbf24` (yellow) - moderate
- 10-15%: `#f97316` (orange) - steep
- 15%+: `#dc2626` (red) - very steep

**Scheme 3: Directional (Komoot-style)**
- Downhill: `#22c55e` (green) - darker for steeper
- Flat: `#fbbf24` (yellow)
- Uphill: `#dc2626` (red) - darker for steeper

## Recommendations for Soneto Project

Based on the research, here are ranked recommendations for implementing slope visualization:

### Option 1: ReferenceArea Overlays (Recommended)

**Approach**: Calculate steep segments, overlay ReferenceArea components with color coding.

**Implementation**:
1. Add `calculateSlope()` utility function
2. Add `findSteepSegments()` function to identify steep sections
3. Render ReferenceArea overlays in ElevationProfile component
4. Use color scheme: yellow (3-6%), orange (6-10%), red (10%+)
5. Add grade percentage to hover tooltip

**Pros**:
- Works with current Recharts setup
- Clear visual indication of steep sections
- Minimal code changes
- Good performance
- Accessible with proper color choices

**Cons**:
- Rectangular overlays don't follow elevation curve perfectly
- May add visual clutter with many segments

**Estimated effort**: 2-3 hours

### Option 2: Enhanced Hover Information

**Approach**: Add slope percentage and visual indicators to the existing hover tooltip.

**Implementation**:
1. Calculate slope for hovered point
2. Display grade percentage in tooltip
3. Color-code the grade value
4. Add directional indicators (↗↘)

**Pros**:
- Minimal code changes
- No visual clutter
- Works with existing hover interaction
- Accessible

**Cons**:
- Only visible on hover, not at a glance
- Doesn't provide overview of entire route

**Estimated effort**: 1 hour

### Option 3: Secondary Grade Chart

**Approach**: Add a second chart below elevation showing grade percentage as a line.

**Implementation**:
1. Calculate slope for all data points
2. Use ComposedChart with two Y-axes
3. Render elevation as Area, grade as Line
4. Color-code grade line by steepness

**Pros**:
- Shows exact grade values at all points
- Easy to identify patterns
- Native Recharts solution

**Cons**:
- Requires more vertical space
- More complex visually
- Two charts to maintain

**Estimated effort**: 2-3 hours

### Option 4: Combination Approach (Best UX)

Combine Options 1 and 2:
- ReferenceArea overlays for visual zones
- Enhanced tooltip with grade information
- Optional: simple color gradient for general elevation zones

**Pros**:
- Best of both worlds
- At-a-glance overview + detailed hover info
- Comprehensive solution

**Cons**:
- More code to maintain
- Slightly more complex

**Estimated effort**: 3-4 hours

## Code References

- `/Users/bendik/dev/soneto/components/elevation-profile.tsx` - Current elevation profile implementation
- `/Users/bendik/dev/soneto/components/map.tsx:117-158` - Elevation data generation with coordinate sampling
- `/Users/bendik/dev/soneto/package.json:61` - Recharts v3.0.2 dependency

## Related Research

- `planning/2025-09-29-fix-elevation-graph-shrinking/research.md` - Recharts XAxis domain behavior
- `planning/2025-09-29-elevation-map-hover-interaction/research.md` - Interactive hover implementation (already completed)

## Example Implementation Snippets

### Calculate Slope Between Points

```javascript
/**
 * Calculate slope percentage between two elevation data points
 * @param {Object} point1 - { distance: number (km), elevation: number (m) }
 * @param {Object} point2 - { distance: number (km), elevation: number (m) }
 * @returns {number} Slope percentage
 */
function calculateSlope(point1, point2) {
  const elevationChange = point2.elevation - point1.elevation; // rise (meters)
  const distanceChange = (point2.distance - point1.distance) * 1000; // run (meters)

  if (distanceChange === 0) return 0;

  return (elevationChange / distanceChange) * 100;
}
```

### Find Steep Segments

```javascript
/**
 * Identify steep segments in elevation data
 * @param {Array} elevationData - Array of { distance, elevation, coordinate }
 * @param {number} threshold - Minimum slope percentage to be considered steep
 * @returns {Array} Array of { x1, x2, avgSlope, maxSlope, type }
 */
function findSteepSegments(elevationData, threshold = 6) {
  const segments = [];
  let currentSegment = null;

  for (let i = 1; i < elevationData.length; i++) {
    const slope = calculateSlope(elevationData[i - 1], elevationData[i]);
    const absSlope = Math.abs(slope);

    if (absSlope >= threshold) {
      if (!currentSegment) {
        // Start new segment
        currentSegment = {
          x1: elevationData[i - 1].distance,
          slopes: [slope],
          type: slope > 0 ? 'uphill' : 'downhill'
        };
      } else {
        currentSegment.slopes.push(slope);
      }
    } else {
      if (currentSegment) {
        // End segment
        currentSegment.x2 = elevationData[i - 1].distance;
        currentSegment.avgSlope =
          currentSegment.slopes.reduce((a, b) => a + b) / currentSegment.slopes.length;
        currentSegment.maxSlope = Math.max(...currentSegment.slopes.map(Math.abs));
        segments.push(currentSegment);
        currentSegment = null;
      }
    }
  }

  // Close final segment if exists
  if (currentSegment) {
    currentSegment.x2 = elevationData[elevationData.length - 1].distance;
    currentSegment.avgSlope =
      currentSegment.slopes.reduce((a, b) => a + b) / currentSegment.slopes.length;
    currentSegment.maxSlope = Math.max(...currentSegment.slopes.map(Math.abs));
    segments.push(currentSegment);
  }

  return segments;
}
```

### Get Slope Color

```javascript
/**
 * Get color for slope percentage based on steepness thresholds
 * @param {number} slope - Slope percentage
 * @returns {string} Hex color code
 */
function getSlopeColor(slope) {
  const absSlope = Math.abs(slope);

  if (absSlope < 3) return "#84cc16";  // lime: gentle
  if (absSlope < 6) return "#fbbf24";  // yellow: moderate
  if (absSlope < 10) return "#f97316"; // orange: steep
  return "#dc2626";                     // red: very steep
}

/**
 * Get opacity for slope visualization
 * @param {number} slope - Slope percentage
 * @returns {number} Opacity value 0-1
 */
function getSlopeOpacity(slope) {
  const absSlope = Math.abs(slope);

  if (absSlope < 3) return 0.15;
  if (absSlope < 6) return 0.25;
  if (absSlope < 10) return 0.35;
  return 0.45;
}
```

### Render ReferenceArea Overlays

```jsx
// In ElevationProfile component
const steepSegments = useMemo(
  () => findSteepSegments(elevationData, 6),
  [elevationData]
);

return (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={chartData}>
      {/* Base elevation area */}
      <Area
        dataKey="elevation"
        fill="#8884d8"
        fillOpacity={0.3}
        stroke="#8884d8"
        strokeWidth={2}
      />

      {/* Overlay steep segments */}
      {steepSegments.map((segment, index) => (
        <ReferenceArea
          key={`steep-${index}`}
          x1={segment.x1}
          x2={segment.x2}
          fill={getSlopeColor(segment.avgSlope)}
          fillOpacity={getSlopeOpacity(segment.avgSlope)}
          stroke={getSlopeColor(segment.avgSlope)}
          strokeOpacity={0.8}
          strokeWidth={1}
          label={
            segment.maxSlope > 10 ? {
              value: `${segment.avgSlope.toFixed(1)}%`,
              position: 'top',
              fontSize: 10,
              fontWeight: 'bold',
              fill: getSlopeColor(segment.avgSlope)
            } : undefined
          }
        />
      ))}

      {/* ... rest of chart components ... */}
    </AreaChart>
  </ResponsiveContainer>
);
```

### Enhanced Tooltip with Slope

```jsx
<Tooltip
  content={({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const index = chartData.findIndex(d => d.distance === label);
    if (index <= 0) return null;

    const slope = calculateSlope(elevationData[index - 1], elevationData[index]);
    const slopeColor = getSlopeColor(slope);
    const slopeIcon = slope > 0 ? '↗' : slope < 0 ? '↘' : '→';

    return (
      <div className="bg-white rounded-lg shadow-lg p-2 border">
        <p className="text-xs text-gray-600">Distance: {label}km</p>
        <p className="text-xs text-gray-800 font-medium">
          Elevation: {payload[0].value}m
        </p>
        <p
          className="text-xs font-bold"
          style={{ color: slopeColor }}
        >
          {slopeIcon} Grade: {slope > 0 ? '+' : ''}{slope.toFixed(1)}%
        </p>
      </div>
    );
  }}
/>
```

## Open Questions

1. Should downhill sections be highlighted differently from uphill (e.g., blue vs red)?
2. What threshold should be used for "steep" - 6%, 8%, or 10%?
3. Should very steep sections (>15%) have text labels showing the grade?
4. Would users prefer a toggle between "elevation view" and "grade view" like RideWithGPS?
5. Should the color scheme match running/cycling conventions (green=easy, red=hard)?
6. How should negative slopes (downhill) be displayed - as distinct from flat, or grouped?

## Next Steps

1. Discuss with user which approach (Option 1-4) best fits their needs
2. Implement chosen approach in `components/elevation-profile.tsx`
3. Add utility functions to `/lib` directory for slope calculations
4. Test with routes of varying steepness
5. Ensure accessibility with color contrast testing
6. Consider adding a legend explaining the color coding
