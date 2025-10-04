import { encode, decode } from '@mapbox/polyline';
import { Point } from './map/point';

/**
 * Truncate coordinate to 6 decimal places (~10cm precision)
 * Matches Google Maps standard and exceeds consumer GPS accuracy
 */
function truncateCoordinate(coord: number): number {
  return Math.round(coord * 1000000) / 1000000;
}

/**
 * Truncate point coordinates to 6 decimal places
 */
function truncatePoint(point: Point): Point {
  return {
    latitude: truncateCoordinate(point.latitude),
    longitude: truncateCoordinate(point.longitude),
  };
}

/**
 * Compress route points to polyline-encoded string
 *
 * @param points - Array of route waypoints
 * @returns Polyline-encoded string (URL-safe)
 *
 * @example
 * const points = [
 *   { latitude: 59.9139, longitude: 10.7522 },
 *   { latitude: 59.9149, longitude: 10.7532 }
 * ];
 * const encoded = compressRoute(points);
 * // Returns: "_p~iF~ps|U_ulL"
 */
export function compressRoute(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }

  // Step 1: Truncate to 6 decimal places for precision optimization
  const truncated = points.map(truncatePoint);

  // Step 2: Convert to polyline format: [lat, lng]
  const coords = truncated.map(p => [p.latitude, p.longitude]);

  // Step 3: Encode as polyline with precision 6
  const encoded = encode(coords, 6);

  return encoded;
}

/**
 * Decompress polyline-encoded string to route points
 *
 * @param encoded - Polyline-encoded string
 * @returns Array of route waypoints
 *
 * @example
 * const encoded = "_p~iF~ps|U_ulL";
 * const points = decompressRoute(encoded);
 * // Returns: [{ latitude: 59.9139, longitude: 10.7522 }, ...]
 */
export function decompressRoute(encoded: string): Point[] {
  if (!encoded || encoded.trim().length === 0) {
    return [];
  }

  try {
    // Decode polyline with precision 6
    const coords = decode(encoded, 6);

    // Convert back to Point objects
    return coords.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch (error) {
    console.error('Failed to decompress route:', error);
    return [];
  }
}

/**
 * Validate that a string is a valid polyline encoding
 *
 * @param encoded - String to validate
 * @returns true if valid polyline encoding
 */
export function isValidPolyline(encoded: string): boolean {
  if (!encoded || encoded.trim().length === 0) {
    return false;
  }

  try {
    const decoded = decode(encoded, 6);
    return decoded.length > 0;
  } catch {
    return false;
  }
}
