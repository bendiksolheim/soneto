import type { Directions } from "@/lib/mapbox";

export function computeWaypointDistances(directions: Array<Directions>): Array<number> {
  const distances = [0];
  let cumulative = 0;
  for (const direction of directions) {
    const route = direction.routes[0];
    if (!route) continue;
    for (const leg of route.legs) {
      cumulative += leg.distance / 1000;
      distances.push(cumulative);
    }
  }
  return distances;
}
