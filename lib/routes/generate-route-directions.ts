import type { Point } from "../map/point";
import { type Directions, directions } from "../mapbox";
import { densifyLineString } from "./densify";
import { destinationPoint } from "./geo";

export const DENSIFY_INTERVAL_METERS = 500;
export const DISTANCE_TOLERANCE = 0.15;
export const MAX_DISTANCE_SCALING_RETRIES = 2;
export const MAX_DIRECTION_ROTATION_RETRIES = 2;

const DIRECTION_ROTATION_STEP_DEGREES = 45;

export type GenerateRouteInput = {
  start: Point;
  targetLengthMeters: number;
  bearing: number;
  elongation: number;
};

export type GenerateRouteResult = {
  points: Point[];
  actualDistanceMeters: number;
  attempts: number;
};

export type ElongatedWaypoints = {
  pFar: Point;
  pLatR: Point;
  pLatL: Point;
};

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

export function initialScale(targetLengthMeters: number, elongation: number): number {
  return targetLengthMeters / (2 * (1 + Math.sqrt(1 + elongation * elongation)));
}

function isUsableResponse(response: Directions): boolean {
  return Array.isArray(response.routes) && response.routes.length > 0;
}

async function tryOnce(
  start: Point,
  targetLengthMeters: number,
  bearing: number,
  elongation: number,
  token: string,
): Promise<{ response: Directions; attempts: number } | null> {
  let scale = initialScale(targetLengthMeters, elongation);
  let scalingAttempts = 0;

  while (true) {
    const { pFar, pLatR, pLatL } = elongatedWaypoints(start, bearing, scale, elongation);

    const response = await directions([start, pLatL, pFar, pLatR, start], token);
    if (!isUsableResponse(response)) {
      return null;
    }

    const actual = response.routes[0].distance;
    const error = Math.abs(actual - targetLengthMeters) / targetLengthMeters;
    if (error <= DISTANCE_TOLERANCE || scalingAttempts >= MAX_DISTANCE_SCALING_RETRIES) {
      return { response, attempts: scalingAttempts + 1 };
    }

    scale = scale * (targetLengthMeters / actual);
    scalingAttempts++;
  }
}

export async function generateRouteDirections(
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
