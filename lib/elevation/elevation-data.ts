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

interface ElevationPoint {
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
