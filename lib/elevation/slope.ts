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
