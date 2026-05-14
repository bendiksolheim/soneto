import { interpolatePointAtDistance } from "@/lib/elevation/elevation-data";
import { mergeDirections } from "@/lib/map/mapUtils";
import type { Directions } from "@/lib/mapbox";

export function buildMarkers(
  directions: Array<Directions>,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const coordinates = mergeDirections(directions);
  const totalDistanceMeters = directions.reduce((acc, dir) => acc + dir.routes[0].distance, 0);

  const features: Array<GeoJSON.Feature<GeoJSON.Point>> = [];
  const lastKm = Math.floor(totalDistanceMeters / 1000);

  for (let km = 1; km <= lastKm; km++) {
    const point = interpolatePointAtDistance(coordinates, km * 1000);
    if (point) {
      features.push({
        type: "Feature",
        properties: { km },
        geometry: { type: "Point", coordinates: point },
      });
    }
  }

  return { type: "FeatureCollection", features };
}
