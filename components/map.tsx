"use client";

import { Point } from "@/lib/map/point";
import { Directions } from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import MapboxMap, {
  HillshadeLayerSpecification,
  Layer,
  MapMouseEvent,
  MapRef,
  Source,
} from "react-map-gl/mapbox";
import { HoverMarker } from "./map/hover-marker";
import { Markers } from "./map/markers";
import { Route } from "./map/route";
import { UserLocationMarker } from "./map/user-location-marker";

interface MapContainerProps {
  mapboxToken: string;
  routePoints: Array<Point>;
  setRoutePoints: (points: Array<Point>) => void;
  directions: Array<Directions>;
  setElevation: (
    elevation: Array<{ distance: number; elevation: number; coordinate: [number, number] }>,
  ) => void;
  hoveredElevationIndex: number | null;
  onElevationHover: (index: number | null) => void;
}

export function Map({
  mapboxToken,
  routePoints,
  setRoutePoints,
  directions,
  setElevation,
  hoveredElevationIndex,
  onElevationHover,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [elevationData, setElevationDataState] = useState<
    Array<{ distance: number; elevation: number; coordinate: [number, number] }>
  >([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Query elevation for route points and generate elevation profile
  useEffect(() => {
    // Only generate elevation data if map is loaded
    if (!mapLoaded) return;

    const data = generateElevationData(mapRef.current, directions);
    setElevationDataState(data);
    setElevation(data);
  }, [directions, setElevation, mapLoaded]);

  const hoveredCoordinate =
    hoveredElevationIndex !== null && elevationData[hoveredElevationIndex]
      ? elevationData[hoveredElevationIndex].coordinate
      : null;

  const onClick = async (e: MapMouseEvent) => {
    // Use unproject to get more accurate coordinates with terrain enabled
    const map = mapRef.current;
    if (map) {
      const point = map.unproject(e.point);
      const newPoint: Point = { latitude: point.lat, longitude: point.lng };
      const newRoutePoints = [...routePoints, newPoint];
      setRoutePoints(newRoutePoints);
    } else {
      // Fallback to original method
      const newPoint: Point = { latitude: e.lngLat.lat, longitude: e.lngLat.lng };
      const newRoutePoints = [...routePoints, newPoint];
      setRoutePoints(newRoutePoints);
    }
  };

  return (
    <MapboxMap
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      initialViewState={{
        latitude: 59.9139,
        longitude: 10.7522,
        zoom: 3,
      }}
      maxZoom={20}
      minZoom={3}
      onClick={onClick}
      onLoad={() => setMapLoaded(true)}
      terrain={{ source: "terrain-source", exaggeration: 0.5 }}
      onMouseMove={(e: MapMouseEvent) => {
        const features = e.target.queryRenderedFeatures(e.point, {
          layers: ["route-layer"],
        });

        if (features.length > 0) {
          const nearestIndex = findNearestElevationPoint(e.lngLat, elevationData);
          if (nearestIndex !== null) {
            onElevationHover(nearestIndex);
          }
        } else if (hoveredElevationIndex !== null) {
          // Clear hover if not over route
          onElevationHover(null);
        }
      }}
      interactiveLayerIds={["route-layer"]}
    >
      {/* Terrain source */}
      <Source id="terrain-source" {...terrainSource} />

      {/* Hillshade layer for visual elevation */}
      <Layer {...hillshadeStyle} source="terrain-source" />

      <Route directions={directions} />
      <Markers route={routePoints} setRoute={setRoutePoints} />
      <UserLocationMarker
        onLocationFound={(location) => {
          mapRef.current.jumpTo({
            center: [location.longitude, location.latitude],
            zoom: 15,
          });
          // setZoom(15);
        }}
      />
      {hoveredCoordinate && <HoverMarker coordinate={hoveredCoordinate} />}
    </MapboxMap>
  );
}

// Terrain source data
const terrainSource = {
  type: "raster-dem" as const,
  url: "mapbox://mapbox.terrain-rgb",
  tileSize: 512,
  maxzoom: 14,
};

const hillshadeStyle: Omit<HillshadeLayerSpecification, "source"> = {
  id: "hillshade",
  type: "hillshade",
  paint: {
    "hillshade-accent-color": "#5a5a5a",
    "hillshade-shadow-color": "#000000",
    "hillshade-illumination-direction": 335,
    "hillshade-exaggeration": 0.6,
  },
};

function generateElevationData(
  mapRef: MapRef | null,
  directions: Array<Directions>,
): Array<{ distance: number; elevation: number; coordinate: [number, number] }> {
  // Generate elevation profile along the route
  if (!mapRef || !directions || directions.length < 1) {
    return [];
  }

  if (directions && directions.length >= 1) {
    const profileData: Array<{
      distance: number;
      elevation: number;
      coordinate: [number, number];
    }> = [];

    // Sample every N meters along the route
    const sampleIntervalMeters = 30;
    const totalDistanceMeters = directions[0].routes[0].distance;
    const numSamples = Math.floor(totalDistanceMeters / sampleIntervalMeters) + 1;

    for (let i = 0; i < numSamples; i++) {
      const targetDistanceMeters = i * sampleIntervalMeters;
      const interpolatedPoint = interpolatePointAtDistance(
        directions[0].routes[0].geometry.coordinates,
        targetDistanceMeters,
      );

      if (interpolatedPoint) {
        const elevation = mapRef.queryTerrainElevation(interpolatedPoint);

        if (elevation !== null && elevation !== undefined) {
          profileData.push({
            distance: targetDistanceMeters / 1000, // Convert back to km
            elevation: elevation,
            coordinate: interpolatedPoint,
          });
        }
      }
    }

    return profileData;
  } else {
    return [];
  }
}

// Helper function to interpolate a point at a specific distance along the route
function interpolatePointAtDistance(
  coordinates: [number, number][],
  targetDistanceMeters: number,
): [number, number] | null {
  if (coordinates.length < 2) return null;

  // Handle the start of the route (distance 0)
  if (targetDistanceMeters <= 0) {
    return coordinates[0];
  }

  let cumulativeDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const segmentDistance = calculateDistance(coordinates[i], coordinates[i + 1]) * 1000; // Convert to meters

    // Check if target distance is within this segment
    if (targetDistanceMeters <= cumulativeDistance + segmentDistance) {
      // The target point is within this segment
      const remainingDistance = targetDistanceMeters - cumulativeDistance;

      // Handle case where segment distance is very small or zero
      if (segmentDistance < 0.001) {
        return coordinates[i];
      }

      const ratio = remainingDistance / segmentDistance;

      // Linear interpolation between the two points
      const lng = coordinates[i][0] + (coordinates[i + 1][0] - coordinates[i][0]) * ratio;
      const lat = coordinates[i][1] + (coordinates[i + 1][1] - coordinates[i][1]) * ratio;

      return [lng, lat];
    }

    cumulativeDistance += segmentDistance;
  }
  return coordinates[coordinates.length - 1];
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[1] * Math.PI) / 180) *
      Math.cos((coord2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the nearest elevation data point to a given coordinate
// Note: Hover performance is acceptable with current 30m sampling.
// If routes exceed 100km and performance degrades, consider:
// 1. Throttling onMouseMove events
// 2. Increasing sample interval for very long routes
// 3. Using spatial indexing for nearest point lookup
function findNearestElevationPoint(
  lngLat: { lng: number; lat: number },
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>,
): number | null {
  if (elevationData.length === 0) return null;

  let nearestIndex = 0;
  let minDistance = Number.MAX_VALUE;

  for (let i = 0; i < elevationData.length; i++) {
    const [lng, lat] = elevationData[i].coordinate;
    const distance = calculateDistance([lng, lat], [lngLat.lng, lngLat.lat]);

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  // Only return if within reasonable proximity (100 meters)
  return minDistance < 0.1 ? nearestIndex : null;
}
