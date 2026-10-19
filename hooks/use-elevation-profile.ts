import { useEffect, useState } from "react";
import {
  generateElevationPoints,
  interpolatePointAtDistance,
} from "@/lib/elevation/elevation-data";
import { createElevationLookup, fetchElevations } from "@/lib/elevation/terrain-rgb";
import type { Directions } from "@/lib/mapbox";

export type ElevationSample = { distance: number; elevation: number; coordinate: [number, number] };

// Query elevation for the current route and generate the elevation profile. Called by the
// page that owns the route, which hands the result to both the map (hover lookup) and the
// elevation panel, so both stay in sync from a single fetch.
export function useElevationProfile(
  directions: Array<Directions>,
  mapboxToken: string,
): Array<ElevationSample> {
  const [elevationData, setElevationData] = useState<Array<ElevationSample>>([]);

  useEffect(() => {
    if (!directions || directions.length < 1) return;

    const coordinates = directions[0].routes[0].geometry.coordinates;
    const totalDistanceMeters = directions[0].routes[0].distance;
    const sampleIntervalMeters = 30;

    let cancelled = false;

    async function fetchAndGenerateElevation() {
      // Sample points along the route
      const numSamples = Math.floor(totalDistanceMeters / sampleIntervalMeters) + 1;
      const sampleCoordinates: [number, number][] = [];

      for (let i = 0; i < numSamples; i++) {
        const targetDistance = i * sampleIntervalMeters;
        const point = interpolatePointAtDistance(coordinates, targetDistance);
        if (point) {
          sampleCoordinates.push(point);
        }
      }

      // Fetch elevation data from Mapbox API
      const elevationMap = await fetchElevations(sampleCoordinates, mapboxToken);

      if (cancelled) return;

      // Generate elevation points using the fetched data
      const data = generateElevationPoints(
        coordinates,
        totalDistanceMeters,
        sampleIntervalMeters,
        createElevationLookup(elevationMap),
      );

      setElevationData(data);
    }

    fetchAndGenerateElevation();

    return () => {
      cancelled = true;
    };
  }, [directions, mapboxToken]);

  return elevationData;
}
