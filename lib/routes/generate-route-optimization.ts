import type { Point } from "../map/point";
import { optimizedTrips } from "../mapbox";
import {
  DISTANCE_TOLERANCE,
  elongatedWaypoints,
  type GenerateRouteInput,
  type GenerateRouteResult,
  initialScale,
  MAX_DISTANCE_SCALING_RETRIES,
  runWithRotationRetries,
  type TryOnceResult,
} from "./shared";

/**
 * Inner scaling loop. Same shape as in `generate-route-directions`, but
 * targets the Optimized Trips API (which decides the waypoint order itself)
 * instead of the Directions API.
 *
 * Returns null when the API can't form a usable trip for this bearing.
 */
async function tryOnce(
  start: Point,
  targetLengthMeters: number,
  bearing: number,
  elongation: number,
  token: string,
): Promise<TryOnceResult | null> {
  let scale = initialScale(targetLengthMeters, elongation);

  for (let attempt = 0; attempt <= MAX_DISTANCE_SCALING_RETRIES; attempt++) {
    const { pFar, pLatR, pLatL } = elongatedWaypoints(start, bearing, scale, elongation);

    // Note: the order we pass is irrelevant — the Optimized Trips API treats
    // `start` as fixed (roundtrip=true is the default) and reorders the rest
    // to minimize total distance.
    const response = await optimizedTrips([start, pFar, pLatR, pLatL], token);
    const trip = response.trips?.[0];
    if (!trip) {
      return null;
    }

    const actual = trip.distance;
    const error = Math.abs(actual - targetLengthMeters) / targetLengthMeters;
    if (error <= DISTANCE_TOLERANCE || attempt === MAX_DISTANCE_SCALING_RETRIES) {
      return { coordinates: trip.geometry.coordinates, distance: actual };
    }

    scale = scale * (targetLengthMeters / actual);
  }

  return null;
}

/**
 * Generates a circular running route by feeding an elongated diamond of
 * waypoints to the Mapbox Optimized Trips API and letting it decide the order.
 *
 * # How it works
 *
 * Same diamond construction as `generate-route-directions`:
 *
 *                            pFar
 *                             /\
 *                            /  \
 *                           /    \
 *                    pLatL ⟨ start ⟩ pLatR
 *                           \    /
 *                            \  /
 *                             \/
 *                          (start)
 *
 * The difference is the API call. We hand Mapbox the four points
 * `[start, pFar, pLatR, pLatL]` in *arbitrary* order; the Optimized Trips
 * endpoint solves a small travelling-salesman problem to visit them all and
 * return to `start` with minimum total walking distance.
 *
 * The scale/rotation retry strategy is identical to the directions algorithm:
 *
 * - If the returned distance is off-target, scale the diamond by
 *   `target / actual` and retry (up to `MAX_DISTANCE_SCALING_RETRIES`).
 * - If the API returns no usable trip, rotate the bearing and try again
 *   (up to `MAX_DIRECTION_ROTATION_RETRIES`).
 *
 * # Trade-offs vs. the other algorithms
 *
 * - Tends to produce more natural loops than `generate-route-directions`
 *   because Mapbox can reorder waypoints when one diamond corner is
 *   awkwardly placed.
 * - Less faithful to the requested bearing — if the optimizer finds a much
 *   shorter visit order, the visible "direction" of the loop may not align
 *   with the user's chosen compass heading.
 */
export async function generateRouteOptimization(
  input: GenerateRouteInput,
  mapboxToken: string,
): Promise<GenerateRouteResult> {
  return runWithRotationRetries(input, (start, target, bearing, elongation) =>
    tryOnce(start, target, bearing, elongation, mapboxToken),
  );
}
