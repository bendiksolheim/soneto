import type { Point } from "../map/point";
import { directions } from "../mapbox";
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
 * Inner scaling loop. Builds an elongated diamond of waypoints, asks the
 * Mapbox Directions API to walk between them in order, and rescales the
 * diamond until the resulting route is within `DISTANCE_TOLERANCE` of the
 * target length (or we run out of scaling retries).
 *
 * Returns null if the API has nothing usable for this bearing (e.g. the
 * start is in the sea, or the road network can't form a loop in that
 * direction). The outer loop will rotate the bearing and call us again.
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

    // Order matters: pLatL → pFar → pLatR traces the diamond counter-clockwise
    // and closing with `start` makes Mapbox return a loop instead of an open path.
    const response = await directions([start, pLatL, pFar, pLatR, start], token);
    const route = response.routes?.[0];
    if (!route) {
      return null;
    }

    const actual = route.distance;
    const error = Math.abs(actual - targetLengthMeters) / targetLengthMeters;
    if (error <= DISTANCE_TOLERANCE || attempt === MAX_DISTANCE_SCALING_RETRIES) {
      return { coordinates: route.geometry.coordinates, distance: actual };
    }

    // Roads rarely lie perfectly along our diamond, so the first try is usually
    // too long (detours) or too short (the API picks a shortcut). Rescale the
    // diamond by the ratio of target/actual and ask again — typically converges
    // in 1-2 retries.
    scale = scale * (targetLengthMeters / actual);
  }

  return null;
}

/**
 * Generates a circular running route of approximately `targetLengthMeters`
 * starting and ending at `input.start`, heading initially toward `input.bearing`.
 *
 * # How it works
 *
 * 1. Construct an elongated diamond of four waypoints around the start:
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
 *    The diamond's long axis points along the requested bearing and is
 *    `elongation` times longer than the short axis. `elongation = 1` gives
 *    a square (almost round) loop; larger values give a longer, narrower one.
 *
 * 2. Ask the Mapbox Directions API to walk start → pLatL → pFar → pLatR → start.
 *    The API decides which streets to follow, so the actual loop will be
 *    longer than the diamond's perimeter (roads zig-zag).
 *
 * 3. Compare the returned distance to the target. If it's off by more than
 *    `DISTANCE_TOLERANCE`, scale the whole diamond by `target / actual` and
 *    retry. We give up after `MAX_DISTANCE_SCALING_RETRIES`.
 *
 * 4. If the API can't find a route at all in this direction (water, no roads),
 *    rotate the bearing by `DIRECTION_ROTATION_STEP_DEGREES` and try the
 *    whole thing again. Steps 3-4 are owned by `runWithRotationRetries`.
 *
 * # Trade-offs vs. the other algorithms
 *
 * - The route follows the requested bearing precisely (the diamond is fixed
 *   in shape), but can produce strange loops if the road network doesn't
 *   cooperate with the diamond's geometry.
 * - Compare with `generate-route-isochrone`, which uses real travel distance
 *   to pick `pFar`, and `generate-route-optimization`, which lets Mapbox
 *   reorder the waypoints.
 */
export async function generateRouteDirections(
  input: GenerateRouteInput,
  mapboxToken: string,
): Promise<GenerateRouteResult> {
  return runWithRotationRetries(input, (start, target, bearing, elongation) =>
    tryOnce(start, target, bearing, elongation, mapboxToken),
  );
}
