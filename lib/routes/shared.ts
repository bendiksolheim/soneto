import type { Point } from "../map/point";
import { densifyLineString, type LngLat } from "./densify";
import { destinationPoint } from "./geo";

export const DENSIFY_INTERVAL_METERS = 500;
export const DISTANCE_TOLERANCE = 0.15;
export const MAX_DISTANCE_SCALING_RETRIES = 2;
export const MAX_DIRECTION_ROTATION_RETRIES = 2;
export const DIRECTION_ROTATION_STEP_DEGREES = 45;

export type GenerateRouteInput = {
  start: Point;
  targetLengthMeters: number;
  bearing: number;
  elongation: number;
};

export type GenerateRouteResult = {
  points: Point[];
  actualDistanceMeters: number;
};

export type TryOnceResult = {
  coordinates: LngLat[];
  distance: number;
};

export type ElongatedWaypoints = {
  pFar: Point;
  pLatR: Point;
  pLatL: Point;
};

/**
 * Places three waypoints around `start` that, together with `start`, form an
 * elongated diamond pointing along `bearing`. The diamond's long axis is
 * `2 * scale * elongation` and its short axis is `2 * scale`.
 *
 *                       pFar           (distance: scale * elongation)
 *                        /\
 *                       /  \
 *                      /    \
 *               pLatL <  start  > pLatR   (each: distance scale, perpendicular)
 *                      \    /
 *                       \  /
 *                        \/
 *                       (back to start — the route is a loop)
 *
 * The directions and optimization algorithms feed these four points to Mapbox;
 * the API then fills in the actual streets between them.
 */
export function elongatedWaypoints(
  start: Point,
  bearing: number,
  scale: number,
  elongation: number,
): ElongatedWaypoints {
  return {
    pFar: destinationPoint(start, bearing, scale * elongation),
    pLatR: destinationPoint(start, (bearing + 90) % 360, scale),
    pLatL: destinationPoint(start, (bearing + 270) % 360, scale),
  };
}

/**
 * First-guess `scale` such that a perfect diamond loop of long axis
 * `scale * elongation` and short axis `scale` has perimeter `targetLengthMeters`.
 *
 * Derivation: the loop's perimeter is 4 * hypot(scale, scale * elongation)
 * = 4 * scale * sqrt(1 + elongation^2). We want that ≈ targetLengthMeters,
 * but actual roads add detours so we conservatively assume the loop is closer
 * to two diagonals plus two perpendiculars, giving the divisor below.
 * This is just a starting point — `tryOnce` scales again from the real distance.
 */
export function initialScale(targetLengthMeters: number, elongation: number): number {
  return targetLengthMeters / (2 * (1 + Math.sqrt(1 + elongation * elongation)));
}

/**
 * Outer retry loop shared by all three route-generation algorithms.
 *
 * Calls `tryOnce` with the requested bearing. If it returns null (the API
 * couldn't produce a usable route in that direction — typically the start
 * point is near water, or there's no road network in the chosen direction),
 * we rotate the bearing by `DIRECTION_ROTATION_STEP_DEGREES` and try again.
 *
 * After `MAX_DIRECTION_ROTATION_RETRIES + 1` attempts the loop throws.
 *
 * On success the raw [lng, lat] polyline from Mapbox is densified into
 * evenly-spaced `Point`s — this gives downstream features (elevation lookup,
 * etc.) a predictable sample interval regardless of road density.
 */
export async function runWithRotationRetries(
  input: GenerateRouteInput,
  tryOnce: (
    start: Point,
    targetLengthMeters: number,
    bearing: number,
    elongation: number,
  ) => Promise<TryOnceResult | null>,
): Promise<GenerateRouteResult> {
  let bearing = input.bearing;

  for (let rotation = 0; rotation <= MAX_DIRECTION_ROTATION_RETRIES; rotation++) {
    const result = await tryOnce(input.start, input.targetLengthMeters, bearing, input.elongation);
    if (result) {
      return {
        points: densifyLineString(result.coordinates, DENSIFY_INTERVAL_METERS),
        actualDistanceMeters: result.distance,
      };
    }
    bearing = (bearing + DIRECTION_ROTATION_STEP_DEGREES) % 360;
  }

  throw new Error("Couldn't generate a route — try a different direction or distance.");
}
