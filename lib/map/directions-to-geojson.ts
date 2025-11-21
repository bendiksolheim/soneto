import { mergeDirections } from "./mapUtils";
import { Directions } from "../mapbox";
import { Point } from "./point";

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
