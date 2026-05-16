import type { Point } from "./map/point";

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

export function directions(coordinates: Array<Point>, token: string): Promise<Directions> {
  const coordinatesString = coordinates
    .map((coord) => `${coord.longitude},${coord.latitude}`)
    .join(";");
  const query = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?overview=full&geometries=geojson&exclude=ferry&continue_straight=true&access_token=${token}`;
  try {
    return fetch(query).then((res) => res.json());
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}

export type OptimizedTrips = {
  trips: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: Array<LatLon>;
      type: string;
    };
    weight: number;
    weight_name: string;
  }>;
  waypoints: Array<{
    waypoint_index: number;
    trips_index: number;
    location: LatLon;
    name: string;
  }>;
  code: string;
};

export function optimizedTrips(coordinates: Array<Point>, token: string): Promise<OptimizedTrips> {
  const coordinatesString = coordinates
    .map((coord) => `${coord.longitude},${coord.latitude}`)
    .join(";");
  const query =
    `https://api.mapbox.com/optimized-trips/v1/mapbox/walking/${coordinatesString}` +
    `?roundtrip=true&source=first&overview=full&geometries=geojson&access_token=${token}`;
  try {
    return fetch(query).then((res) => res.json());
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}

export type Isochrone = {
  features: Array<{
    geometry: {
      type: "Polygon";
      coordinates: Array<Array<[number, number]>>;
    };
    properties: { contour: number };
  }>;
};

export function isochrone(center: Point, contourMeters: number, token: string): Promise<Isochrone> {
  const query =
    `https://api.mapbox.com/isochrone/v1/mapbox/walking/${center.longitude},${center.latitude}` +
    `?contours_meters=${Math.round(contourMeters)}&polygons=true&access_token=${token}`;
  try {
    return fetch(query).then((res) => res.json());
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}
