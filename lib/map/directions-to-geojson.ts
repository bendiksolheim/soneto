import { mergeDirections } from "@/utils/mapUtils";
import { Directions } from "../mapbox";

export function directionsToGeoJson(
  directions: Array<Directions>,
): GeoJSON.GeoJSON {
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
