import { type Point } from "./map/point";

type LatLon = [number, number];

export type Directions = {
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: Array<LatLon>;
      type: string;
    };
    legs: Array<{
      distance: number;
      duration: number;
      steps: Array<unknown>;
      summary: string;
      via_waypoints: Array<unknown>;
      weight: number;
    }>;
    weight: number;
    weight_name: string;
  }>;
  uuid: string;
  waypoints: Array<{
    distance: number;
    location: LatLon;
    name: string;
  }>;
};

export function directions(
  coordinates: Array<Point>,
  token: string,
): Promise<Directions> {
  const coordinatesString = coordinates
    .map((coord) => `${coord.longitude},${coord.latitude}`)
    .join(";");
  const query = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?overview=full&geometries=geojson&access_token=${token}`;
  try {
    return fetch(query).then((res) => res.json());
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}
