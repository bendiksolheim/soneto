import { compressRoute, decompressRoute } from './route-compression';
import { Point } from './map/point';

/**
 * Generate shareable URL for a route
 *
 * @param points - Route waypoints
 * @param baseUrl - Base URL (defaults to current origin)
 * @returns Complete shareable URL
 *
 * @example
 * const url = generateShareUrl(routePoints);
 * // Returns: "https://soneto.app?route=_p~iF~ps|U..."
 */
export function generateShareUrl(
  points: Point[],
  baseUrl?: string
): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const encoded = compressRoute(points);

  if (!encoded) {
    return base;
  }

  return `${base}?route=${encoded}`;
}

/**
 * Extract route from URL search parameters
 *
 * @param searchParams - URL search parameters string or URLSearchParams
 * @returns Decoded route points, or null if no valid route in URL
 *
 * @example
 * const points = extractRouteFromUrl(window.location.search);
 * if (points) {
 *   setRoutePoints(points);
 * }
 */
export function extractRouteFromUrl(
  searchParams: string | URLSearchParams
): Point[] | null {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;

  const routeParam = params.get('route');

  if (!routeParam) {
    return null;
  }

  const points = decompressRoute(routeParam);

  return points.length > 0 ? points : null;
}

/**
 * Get URL length for a route (useful for validation)
 *
 * @param points - Route waypoints
 * @param baseUrl - Base URL (defaults to current origin)
 * @returns URL length in characters
 */
export function getShareUrlLength(
  points: Point[],
  baseUrl?: string
): number {
  return generateShareUrl(points, baseUrl).length;
}
