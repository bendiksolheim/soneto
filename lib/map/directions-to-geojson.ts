import type { Directions } from "../mapbox";
import { mergeDirections } from "./mapUtils";

export function directionsToGeoJson(directions: Array<Directions>): GeoJSON.GeoJSON {
  const coordinates = mergeDirections(directions);
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}
