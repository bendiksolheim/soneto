export interface StoredRoute {
  id: string; // Unique identifier (UUID)
  name: string; // User-friendly route name
  points: [number, number][]; // [longitude, latitude] coordinates
  createdAt: string; // ISO string timestamp
}

export interface RouteStorage {
  routes: StoredRoute[];
  lastModified: string;
}

// Helper function to calculate distance between two coordinates using Haversine formula
function getDistanceBetweenPoints(
  point1: [number, number],
  point2: [number, number],
): number {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate total route distance from points array
export function calculateRouteDistance(points: [number, number][]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += getDistanceBetweenPoints(points[i - 1], points[i]);
  }

  return totalDistance;
}

// Extended route interface with calculated properties
export interface RouteWithCalculatedData extends StoredRoute {
  distance: number;
}

// Storage configuration
export const ROUTES_STORAGE_KEY = "route-runner-routes";

// Default empty storage
export const DEFAULT_ROUTE_STORAGE: RouteStorage = {
  routes: [],
  lastModified: new Date().toISOString(),
};
