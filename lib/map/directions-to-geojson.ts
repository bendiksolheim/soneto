import { Directions } from "../mapbox";

export function directionsToGeoJson(
  directions: Array<Directions>,
): GeoJSON.GeoJSON {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates:
        directions.length > 0
          ? directions[0].routes[0].geometry.coordinates
          : [],
    },
  };
}
