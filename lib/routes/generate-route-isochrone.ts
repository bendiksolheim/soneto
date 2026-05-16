import type { Point } from "../map/point";
import { type Directions, directions, isochrone } from "../mapbox";
import { densifyLineString } from "./densify";
import {
  DENSIFY_INTERVAL_METERS,
  DISTANCE_TOLERANCE,
  type GenerateRouteInput,
  type GenerateRouteResult,
  initialScale,
  MAX_DIRECTION_ROTATION_RETRIES,
  MAX_DISTANCE_SCALING_RETRIES,
} from "./generate-route-directions";
import { bearingTo, destinationPoint } from "./geo";

const DIRECTION_ROTATION_STEP_DEGREES = 45;

function isUsableDirections(response: Directions): boolean {
  return Array.isArray(response.routes) && response.routes.length > 0;
}

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

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

async function tryOnce(
  start: Point,
  targetLengthMeters: number,
  bearing: number,
  elongation: number,
  token: string,
): Promise<{ response: Directions; attempts: number } | null> {
  let scale = initialScale(targetLengthMeters, elongation);
  let rIso = scale * elongation;
  let scalingAttempts = 0;

  while (true) {
    const iso = await isochrone(start, rIso, token);
    const polygon = iso.features?.[0]?.geometry?.coordinates?.[0];
    if (!polygon || polygon.length < 3) {
      return null;
    }

    const pFar = pickVertexClosestToBearing(polygon, start, bearing);
    const pLatR = destinationPoint(start, (bearing + 90) % 360, scale);
    const pLatL = destinationPoint(start, (bearing + 270) % 360, scale);

    const response = await directions([start, pLatL, pFar, pLatR, start], token);
    if (!isUsableDirections(response)) {
      return null;
    }

    const actual = response.routes[0].distance;
    const error = Math.abs(actual - targetLengthMeters) / targetLengthMeters;
    if (error <= DISTANCE_TOLERANCE || scalingAttempts >= MAX_DISTANCE_SCALING_RETRIES) {
      return { response, attempts: scalingAttempts + 1 };
    }

    const factor = targetLengthMeters / actual;
    scale *= factor;
    rIso *= factor;
    scalingAttempts++;
  }
}

export async function generateRouteIsochrone(
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
      const route = outcome.response.routes[0];
      const points = densifyLineString(route.geometry.coordinates, DENSIFY_INTERVAL_METERS);
      return {
        points,
        actualDistanceMeters: route.distance,
        attempts,
      };
    }
    attempts++;
    bearing = (bearing + DIRECTION_ROTATION_STEP_DEGREES) % 360;
  }

  throw new Error("Couldn't generate a route — try a different direction or distance.");
}
