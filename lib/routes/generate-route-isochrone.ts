import type { Point } from "../map/point";
import { directions, isochrone } from "../mapbox";
import { bearingTo } from "./geo";
import {
  bulgeWaypoints,
  type GenerateRouteInput,
  type GenerateRouteResult,
  initialScale,
  lateralWaypoints,
  MAX_DISTANCE_SCALING_RETRIES,
  runWithRotationRetries,
  type TryOnceResult,
} from "./shared";

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Walks the isochrone polygon vertices and returns the one whose bearing from
 * `reference` is closest to `targetBearing`. Used to pick `pFar`: of all the
 * places we can actually walk to in time `rIso`, we pick the one nearest to
 * the user's chosen direction.
 */
function pickVertexClosestToBearing(
  vertices: Array<[number, number]>,
  reference: Point,
  targetBearing: number,
): Point {
  let best = vertices[0];
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const [lng, lat] of vertices) {
    const candidate: Point = { latitude: lat, longitude: lng };
    const diff = angularDistance(bearingTo(reference, candidate), targetBearing);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [lng, lat];
    }
  }

  return { latitude: best[1], longitude: best[0] };
}

/**
 * Inner scaling loop. Asks Mapbox for an isochrone polygon (everything
 * reachable within `rIso` metres of walking), picks the polygon vertex
 * closest to the requested bearing as `pFar`, then routes a loop through
 * `pFar` and two perpendicular lateral points.
 *
 * Rescales both the lateral offset and the isochrone radius until the loop
 * length is on target, or returns null if the isochrone/directions calls
 * produce nothing usable in this direction.
 */
async function tryOnce(
  start: Point,
  targetLengthMeters: number,
  bearing: number,
  elongation: number,
  distanceTolerance: number,
  lateralOffset: number,
  bulgeAmt: number,
  token: string,
): Promise<TryOnceResult | null> {
  let scale = initialScale(targetLengthMeters, elongation, lateralOffset);
  let rIso = scale * elongation;

  for (let attempt = 0; attempt <= MAX_DISTANCE_SCALING_RETRIES; attempt++) {
    const iso = await isochrone(start, rIso, token);
    // Isochrone returns a FeatureCollection of polygons; we ask for one
    // contour so we want its outer ring. <3 vertices means the polygon is
    // degenerate (start near water, no reachable area, etc.) — bail out
    // and let the outer loop rotate the bearing.
    const polygon = iso.features?.[0]?.geometry?.coordinates?.[0];
    if (!polygon || polygon.length < 3) {
      return null;
    }

    // pFar lives on the isochrone boundary in the requested direction, so by
    // construction it's roughly `rIso` walking-metres from start — closer to
    // the user's distance target than a straight-line point would be.
    const pFar = pickVertexClosestToBearing(polygon, start, bearing);
    const { pLatL, pLatR } = lateralWaypoints(start, bearing, scale, rIso, lateralOffset);

    const midpoints =
      bulgeAmt > 0 ? bulgeWaypoints(start, pLatL, pFar, pLatR, bulgeAmt * scale) : undefined;
    const waypointList = midpoints
      ? [start, midpoints[0], pLatL, midpoints[1], pFar, midpoints[2], pLatR, midpoints[3], start]
      : [start, pLatL, pFar, pLatR, start];
    const response = await directions(waypointList, token);
    const route = response.routes?.[0];
    if (!route) {
      return null;
    }

    const actual = route.distance;
    const error = Math.abs(actual - targetLengthMeters) / targetLengthMeters;
    if (error <= distanceTolerance || attempt === MAX_DISTANCE_SCALING_RETRIES) {
      return {
        coordinates: route.geometry.coordinates,
        distance: actual,
        debug: {
          diamond: { start, pFar, pLatL, pLatR, midpoints },
          isochronePolygon: polygon as [number, number][],
        },
      };
    }

    // Scale both lateral offset and isochrone radius by the same factor so
    // the loop's overall shape is preserved while its size changes.
    const factor = targetLengthMeters / actual;
    scale *= factor;
    rIso *= factor;
  }

  return null;
}

/**
 * Generates a circular running route by anchoring its far point on a
 * walking-time isochrone instead of on a fixed-shape diamond.
 *
 * # How it works
 *
 * 1. Ask Mapbox for an isochrone polygon centred at `start` with radius
 *    `rIso = initialScale * elongation` metres. This polygon outlines
 *    everywhere a walker can reach within that distance along real roads.
 *
 *                       . - - - - - .
 *                     /  ◦         ◦  \
 *                    /     ◦   ◦      \
 *                   |   ◦  start  ◦    |     ◦ = polygon vertex
 *                    \    ◦   ◦      /
 *                     \ ◦      pFar ◦      ← chosen vertex: closest
 *                       ' - - - - - '         bearing to user's direction
 *
 * 2. Walk the polygon vertices and pick the one whose bearing from `start`
 *    is closest to the user's requested bearing. This becomes `pFar`.
 *
 * 3. Build two lateral points `pLatL`, `pLatR` perpendicular to the bearing
 *    at distance `scale`, then ask the Directions API to walk
 *    `start → pLatL → pFar → pLatR → start`.
 *
 * 4. If the resulting loop length is off-target, scale both `scale` and
 *    `rIso` by `target / actual` and retry — preserving the loop's overall
 *    proportions.
 *
 * 5. If the isochrone or directions call produces nothing usable, rotate
 *    the bearing and try again. Owned by `runWithRotationRetries`.
 *
 * # Trade-offs vs. the other algorithms
 *
 * - Most accurate distance estimate before the directions call: `pFar` is
 *   already roughly `rIso` walking-metres away, not straight-line metres,
 *   so the loop length converges faster.
 * - Costs an extra API call per attempt (isochrone + directions, vs. just
 *   directions or optimized-trips).
 * - The far point follows real roads, so the loop's direction may visibly
 *   deviate from the requested bearing in dense or one-sided road networks.
 */
export async function generateRouteIsochrone(
  input: GenerateRouteInput,
  mapboxToken: string,
): Promise<GenerateRouteResult> {
  return runWithRotationRetries(input, (start, target, bearing, elongation, distanceTolerance) =>
    tryOnce(
      start,
      target,
      bearing,
      elongation,
      distanceTolerance,
      input.lateralOffset,
      input.bulgeAmount,
      mapboxToken,
    ),
  );
}
