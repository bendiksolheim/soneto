import type { Point } from "../map/point";
import { haversineDistanceMeters } from "./geo";

export type LngLat = [number, number];

function lngLatToPoint([longitude, latitude]: LngLat): Point {
  return { latitude, longitude };
}

function interpolate(a: Point, b: Point, t: number): Point {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

export function densifyLineString(coordinates: Array<LngLat>, intervalMeters: number): Point[] {
  if (coordinates.length === 0) return [];
  if (coordinates.length === 1) return [lngLatToPoint(coordinates[0])];

  const result: Point[] = [lngLatToPoint(coordinates[0])];
  let distanceSinceLastSample = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const segmentStart = lngLatToPoint(coordinates[i - 1]);
    const segmentEnd = lngLatToPoint(coordinates[i]);
    const segmentLength = haversineDistanceMeters(segmentStart, segmentEnd);

    if (segmentLength === 0) continue;

    let remaining = segmentLength;
    let cursor = segmentStart;

    while (distanceSinceLastSample + remaining >= intervalMeters) {
      const stepAlongSegment = intervalMeters - distanceSinceLastSample;
      const t = stepAlongSegment / haversineDistanceMeters(cursor, segmentEnd);
      const sample = interpolate(cursor, segmentEnd, t);
      result.push(sample);
      cursor = sample;
      remaining -= stepAlongSegment;
      distanceSinceLastSample = 0;
    }

    distanceSinceLastSample += remaining;
  }

  const last = lngLatToPoint(coordinates[coordinates.length - 1]);
  const lastSample = result[result.length - 1];
  if (lastSample.latitude !== last.latitude || lastSample.longitude !== last.longitude) {
    result.push(last);
  }

  return result;
}
