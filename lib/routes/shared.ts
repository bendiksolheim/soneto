import type { Point } from "../map/point";
import { densifyLineString, type LngLat } from "./densify";
import { bearingTo, destinationPoint } from "./geo";

export const MAX_DISTANCE_SCALING_RETRIES = 2;
const MAX_DIRECTION_ROTATION_RETRIES = 2;
const DIRECTION_ROTATION_STEP_DEGREES = 45;

export type GenerateRouteInput = {
  start: Point;
  targetLengthMeters: number;
  bearing: number;
  elongation: number;
  lateralOffset: number;
  bulgeAmount: number;
  distanceTolerance: number;
  densifyIntervalMeters: number;
};

export type RouteDebugData = {
  diamond: {
    start: Point;
    pFar: Point;
    pLatL: Point;
    pLatR: Point;
    midpoints?: [Point, Point, Point, Point];
  };
  isochronePolygon?: [number, number][];
};

export type GenerateRouteResult = {
  points: Point[];
  actualDistanceMeters: number;
  debug: RouteDebugData;
};

export type TryOnceResult = {
  coordinates: LngLat[];
  distance: number;
  debug: RouteDebugData;
};

export type ElongatedWaypoints = {
  pFar: Point;
  pLatR: Point;
  pLatL: Point;
};

/**
 * Places pLatL and pLatR perpendicular to a point `forwardDistance * lateralOffset`
 * ahead of `start` along `bearing`.
 *
 * `lateralOffset = 0` puts the lateral points at start's level (current triangle).
 * `lateralOffset = 0.5` puts them halfway to pFar (kite/arrowhead with start as rear corner).
 * `lateralOffset = 1` puts them at pFar's level.
 */
export function lateralWaypoints(
  start: Point,
  bearing: number,
  scale: number,
  forwardDistance: number,
  lateralOffset: number,
): { pLatL: Point; pLatR: Point } {
  const midPoint = destinationPoint(start, bearing, forwardDistance * lateralOffset);
  return {
    pLatL: destinationPoint(midPoint, (bearing + 270) % 360, scale),
    pLatR: destinationPoint(midPoint, (bearing + 90) % 360, scale),
  };
}

/**
 * Computes 4 outward-pushed midpoints for the rounded topology.
 *
 * For each edge of the kite (start→pLatL, pLatL→pFar, pFar→pLatR, pLatR→start),
 * finds the geographic midpoint and pushes it radially outward from the centroid
 * of the four corners by `pushDistance` meters.
 *
 * Returns midpoints in route order: [m₀₁, m₁₂, m₂₃, m₃₀].
 * At `pushDistance = 0` each midpoint lies exactly on its edge (kite degeneracy).
 */
export function bulgeWaypoints(
  start: Point,
  pLatL: Point,
  pFar: Point,
  pLatR: Point,
  pushDistance: number,
): [Point, Point, Point, Point] {
  const centroid: Point = {
    latitude: (start.latitude + pLatL.latitude + pFar.latitude + pLatR.latitude) / 4,
    longitude: (start.longitude + pLatL.longitude + pFar.longitude + pLatR.longitude) / 4,
  };

  function pushedMidpoint(a: Point, b: Point): Point {
    const mid: Point = {
      latitude: (a.latitude + b.latitude) / 2,
      longitude: (a.longitude + b.longitude) / 2,
    };
    return destinationPoint(mid, bearingTo(centroid, mid), pushDistance);
  }

  return [
    pushedMidpoint(start, pLatL),
    pushedMidpoint(pLatL, pFar),
    pushedMidpoint(pFar, pLatR),
    pushedMidpoint(pLatR, start),
  ];
}

/**
 * Places three waypoints forming a loop shape around `start` pointing along `bearing`.
 *
 * `lateralOffset = 0` produces a triangle with start at the base midpoint.
 * `lateralOffset = 0.5` produces a kite/arrowhead with start as the rear corner.
 *
 *   lateralOffset = 0 (triangle):       lateralOffset = 0.5 (kite):
 *
 *          pFar                                 pFar
 *           /\                                   /\
 *          /  \                                 /  \
 *   pLatL--start--pLatR               pLatL        pLatR
 *                                          \      /
 *                                           start
 */
export function elongatedWaypoints(
  start: Point,
  bearing: number,
  scale: number,
  elongation: number,
  lateralOffset: number,
): ElongatedWaypoints {
  const { pLatL, pLatR } = lateralWaypoints(
    start,
    bearing,
    scale,
    scale * elongation,
    lateralOffset,
  );
  return {
    pFar: destinationPoint(start, bearing, scale * elongation),
    pLatL,
    pLatR,
  };
}

/**
 * First-guess `scale` such that the loop's straight-line perimeter equals
 * `targetLengthMeters`. Accounts for `lateralOffset` — at `f = 0` this
 * reduces to the original formula.
 *
 * Perimeter = 2 × scale × (√(1+(f·e)²) + √(1+((1−f)·e)²))
 * where e = elongation, f = lateralOffset.
 *
 * This is just a starting point — `tryOnce` scales again from the real distance.
 */
export function initialScale(
  targetLengthMeters: number,
  elongation: number,
  lateralOffset: number,
): number {
  const fe = lateralOffset * elongation;
  const re = (1 - lateralOffset) * elongation;
  return targetLengthMeters / (2 * (Math.sqrt(1 + fe * fe) + Math.sqrt(1 + re * re)));
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
    distanceTolerance: number,
  ) => Promise<TryOnceResult | null>,
): Promise<GenerateRouteResult> {
  let bearing = input.bearing;

  for (let rotation = 0; rotation <= MAX_DIRECTION_ROTATION_RETRIES; rotation++) {
    const result = await tryOnce(
      input.start,
      input.targetLengthMeters,
      bearing,
      input.elongation,
      input.distanceTolerance,
    );
    if (result) {
      return {
        points: densifyLineString(result.coordinates, input.densifyIntervalMeters),
        actualDistanceMeters: result.distance,
        debug: result.debug,
      };
    }
    bearing = (bearing + DIRECTION_ROTATION_STEP_DEGREES) % 360;
  }

  throw new Error("Couldn't generate a route — try a different direction or distance.");
}
