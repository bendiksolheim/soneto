import type { Point } from "../map/point";
import { type OptimizedTrips, optimizedTrips } from "../mapbox";
import { densifyLineString } from "./densify";
import {
  DENSIFY_INTERVAL_METERS,
  DISTANCE_TOLERANCE,
  elongatedWaypoints,
  type GenerateRouteInput,
  type GenerateRouteResult,
  initialScale,
  MAX_DIRECTION_ROTATION_RETRIES,
  MAX_DISTANCE_SCALING_RETRIES,
} from "./generate-route-directions";

const DIRECTION_ROTATION_STEP_DEGREES = 45;

function isUsableTrips(response: OptimizedTrips): boolean {
  return Array.isArray(response.trips) && response.trips.length > 0;
}

async function tryOnce(
  start: Point,
  targetLengthMeters: number,
  bearing: number,
  elongation: number,
  token: string,
): Promise<{ response: OptimizedTrips; attempts: number } | null> {
  let scale = initialScale(targetLengthMeters, elongation);
  let scalingAttempts = 0;

  while (true) {
    const { pFar, pLatR, pLatL } = elongatedWaypoints(start, bearing, scale, elongation);

    const response = await optimizedTrips([start, pFar, pLatR, pLatL], token);
    if (!isUsableTrips(response)) {
      return null;
    }

    const actual = response.trips[0].distance;
    const error = Math.abs(actual - targetLengthMeters) / targetLengthMeters;
    if (error <= DISTANCE_TOLERANCE || scalingAttempts >= MAX_DISTANCE_SCALING_RETRIES) {
      return { response, attempts: scalingAttempts + 1 };
    }

    scale = scale * (targetLengthMeters / actual);
    scalingAttempts++;
  }
}

export async function generateRouteOptimization(
  input: GenerateRouteInput,
  mapboxToken: string,
): Promise<GenerateRouteResult> {
  let bearing = input.bearing;
  let attempts = 0;

  for (let rotation = 0; rotation <= MAX_DIRECTION_ROTATION_RETRIES; rotation++) {
    const outcome = await tryOnce(
      input.start,
      input.targetLengthMeters,
      bearing,
      input.elongation,
      mapboxToken,
    );
    if (outcome) {
      attempts += outcome.attempts;
      const trip = outcome.response.trips[0];
      const points = densifyLineString(trip.geometry.coordinates, DENSIFY_INTERVAL_METERS);
      return {
        points,
        actualDistanceMeters: trip.distance,
        attempts,
      };
    }
    attempts++;
    bearing = (bearing + DIRECTION_ROTATION_STEP_DEGREES) % 360;
  }

  throw new Error("Couldn't generate a route — try a different direction or distance.");
}
