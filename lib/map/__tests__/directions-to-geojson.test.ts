import { describe, expect, it } from "vitest";
import type { Directions } from "../../mapbox";
import { directionsToGeoJson } from "../directions-to-geojson";

function makeDirections(coordinates: [number, number][]): Directions {
  return {
    routes: [
      {
        distance: 100,
        duration: 60,
        geometry: { coordinates, type: "LineString" },
        legs: [],
        weight: 60,
        weight_name: "duration",
      },
    ],
    uuid: "test-uuid",
    waypoints: [],
  };
}

describe("directionsToGeoJson", () => {
  it("returns a GeoJSON Feature", () => {
    const result = directionsToGeoJson([makeDirections([[10, 59]])]);
    expect(result.type).toBe("Feature");
  });

  it("returns LineString geometry", () => {
    const result = directionsToGeoJson([makeDirections([[10, 59]])]) as GeoJSON.Feature;
    expect(result.geometry.type).toBe("LineString");
  });

  it("preserves coordinates from a single directions object", () => {
    const coords: [number, number][] = [
      [10.7522, 59.9139],
      [10.7532, 59.9149],
    ];
    const result = directionsToGeoJson([
      makeDirections(coords),
    ]) as GeoJSON.Feature<GeoJSON.LineString>;

    expect(result.geometry.coordinates).toEqual(coords);
  });

  it("merges multiple directions and removes duplicate junction points", () => {
    const coords1: [number, number][] = [
      [10.0, 59.0],
      [10.1, 59.1],
    ];
    const coords2: [number, number][] = [
      [10.1, 59.1],
      [10.2, 59.2],
    ];

    const result = directionsToGeoJson([
      makeDirections(coords1),
      makeDirections(coords2),
    ]) as GeoJSON.Feature<GeoJSON.LineString>;

    expect(result.geometry.coordinates).toHaveLength(3);
    expect(result.geometry.coordinates[0]).toEqual([10.0, 59.0]);
    expect(result.geometry.coordinates[2]).toEqual([10.2, 59.2]);
  });

  it("sets empty properties object", () => {
    const result = directionsToGeoJson([makeDirections([[10, 59]])]) as GeoJSON.Feature;
    expect(result.properties).toEqual({});
  });
});
