import { Directions } from "@/lib/mapbox";

export function mergeDirections(
  directions: Array<Directions>,
): Array<[number, number]> {
  if (directions.length === 0) {
    return [];
  } else if (directions.length === 1) {
    return directions[0].routes[0].geometry.coordinates;
  } else {
    const coordinates = directions[0].routes[0].geometry.coordinates;
    return directions.slice(1).reduce((acc, dir) => {
      const nextCoords = dir.routes[0].geometry.coordinates.slice(1);
      return [...acc, ...nextCoords];
    }, coordinates);
  }
}
