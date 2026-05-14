import { describe, expect, it } from "vitest";
import type { Directions } from "@/lib/mapbox";
import { buildMarkers } from "../distance-markers";

// Two coordinates ~11.13 km apart along the equator — wide enough for any
// km interpolation in these tests to fall on the single segment.
const LONG_SEGMENT: Array<[number, number]> = [
  [0, 0],
  [0.1, 0],
];

function makeDirections(coords: Array<[number, number]>, distanceMeters: number): Directions {
  return {
    routes: [{ distance: distanceMeters, geometry: { coordinates: coords } }],
  } as Directions;
}

describe("buildMarkers", () => {
  it("returns an empty FeatureCollection when given no directions", () => {
    const result = buildMarkers([]);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toEqual([]);
  });

  it("returns no features for a route shorter than 1 km", () => {
    const result = buildMarkers([makeDirections(LONG_SEGMENT, 500)]);
    expect(result.features).toEqual([]);
  });

  it("returns a single feature at km 1 for a 1.5 km route", () => {
    const result = buildMarkers([makeDirections(LONG_SEGMENT, 1500)]);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties).toEqual({ km: 1 });
    expect(result.features[0].geometry.type).toBe("Point");
  });

  it("returns features at km 1 and km 2 for a 2.5 km route", () => {
    const result = buildMarkers([makeDirections(LONG_SEGMENT, 2500)]);
    expect(result.features.map((f) => f.properties?.km)).toEqual([1, 2]);
  });

  it("sums distance across multiple direction segments", () => {
    const result = buildMarkers([
      makeDirections(LONG_SEGMENT, 1500),
      makeDirections(
        [
          [0.1, 0],
          [0.2, 0],
        ],
        1500,
      ),
    ]);
    expect(result.features.map((f) => f.properties?.km)).toEqual([1, 2, 3]);
  });

  it("produces point geometries with [lng, lat] coordinates", () => {
    const result = buildMarkers([makeDirections(LONG_SEGMENT, 2500)]);
    for (const f of result.features) {
      expect(f.geometry.coordinates).toHaveLength(2);
      expect(typeof f.geometry.coordinates[0]).toBe("number");
      expect(typeof f.geometry.coordinates[1]).toBe("number");
    }
  });
});
