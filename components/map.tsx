"use client";

import { LngLatBounds } from "mapbox-gl";
import {
  calculateDistance,
  generateElevationPoints,
  interpolatePointAtDistance,
} from "@/lib/elevation/elevation-data";
import { createElevationLookup, fetchElevations } from "@/lib/elevation/terrain-rgb";
import type { Point } from "@/lib/map/point";
import type { Directions } from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import MapboxMap, {
  type HillshadeLayerSpecification,
  Layer,
  type MapMouseEvent,
  type MapRef,
  NavigationControl,
  ScaleControl,
  Source,
} from "react-map-gl/mapbox";
import { useUserLocation } from "@/hooks/use-user-location";
import type { RouteDebugData } from "@/lib/routes";
import { DistanceMarkers } from "./map/distance-markers";
import { HoverMarker } from "./map/hover-marker";
import { LocationControl, type TrackingMode } from "./map/location-control";
import { Markers } from "./map/markers";
import { Route } from "./map/route";
import { RouteDebugOverlay } from "./map/route-debug-overlay";
import { UserLocationMarker } from "./map/user-location-marker";

const SearchBox = dynamic(() => import("./map/search-box").then((mod) => mod.SearchBox), {
  ssr: false,
});

interface MapContainerProps {
  mapboxToken: string;
  routePoints: Array<Point>;
  setRoutePoints: (points: Array<Point>) => void;
  directions: Array<Directions>;
  setElevation: (
    elevation: Array<{
      distance: number;
      elevation: number;
      coordinate: [number, number];
    }>,
  ) => void;
  hoveredElevationIndex: number | null;
  onElevationHover: (index: number | null) => void;
  hoveredPointIndex: number | null;
  onPointHover: (index: number | null) => void;
  onDeletePoint: (index: number) => void;
  shouldFitBounds?: boolean;
  onFitBoundsComplete?: () => void;
  onUserLocationFound?: (location: Point) => void;
  debugData?: RouteDebugData | null;
}

export function RunMap({
  mapboxToken,
  routePoints,
  setRoutePoints,
  directions,
  setElevation,
  hoveredElevationIndex,
  onElevationHover,
  hoveredPointIndex,
  onPointHover,
  onDeletePoint,
  shouldFitBounds,
  onFitBoundsComplete,
  onUserLocationFound,
  debugData,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [elevationData, setElevationDataState] = useState<
    Array<{ distance: number; elevation: number; coordinate: [number, number] }>
  >([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("off");
  const hasCenteredOnUser = useRef(false);
  const {
    location: userLocation,
    start,
    stop,
  } = useUserLocation({
    onError: () => setTrackingMode("off"),
  });

  // Toggle location tracking through the OFF -> FOLLOWING -> OFF cycle, with LOCATED
  // (camera detached after a manual pan) resuming FOLLOWING on the next press.
  const handleLocationToggle = () => {
    switch (trackingMode) {
      case "off":
        hasCenteredOnUser.current = false;
        setTrackingMode("following");
        start();
        break;
      case "following":
        setTrackingMode("off");
        stop();
        break;
      case "located":
        setTrackingMode("following");
        break;
    }
  };

  // Keep the camera on the user while following. The first fix flies in at street zoom;
  // subsequent fixes (and resuming from LOCATED) ease to the new position at the current
  // zoom so we don't yank the user around.
  useEffect(() => {
    if (trackingMode !== "following" || !userLocation || !mapRef.current) return;

    const center: [number, number] = [userLocation.longitude, userLocation.latitude];
    if (hasCenteredOnUser.current) {
      mapRef.current.easeTo({ center, duration: 500 });
    } else {
      mapRef.current.flyTo({ center, zoom: 15 });
      hasCenteredOnUser.current = true;
    }
  }, [trackingMode, userLocation]);

  // Surface the latest position upward (e.g. for Auto-Route) regardless of follow state.
  useEffect(() => {
    if (userLocation) {
      onUserLocationFound?.(userLocation);
    }
  }, [userLocation, onUserLocationFound]);

  // Query elevation for route points and generate elevation profile
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

      setElevationDataState(data);
      setElevation(data);
    }

    fetchAndGenerateElevation();

    return () => {
      cancelled = true;
    };
  }, [directions, setElevation, mapboxToken]);

  // Fit map bounds when a route is loaded
  useEffect(() => {
    if (shouldFitBounds && mapLoaded && routePoints.length >= 2 && mapRef.current) {
      const bounds = new LngLatBounds();
      routePoints.forEach((point) => {
        bounds.extend([point.longitude, point.latitude]);
      });

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16,
        duration: 1000,
      });

      onFitBoundsComplete?.();
    }
  }, [shouldFitBounds, mapLoaded, routePoints, onFitBoundsComplete]);

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
      const newPoint: Point = {
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
      };
      const newRoutePoints = [...routePoints, newPoint];
      setRoutePoints(newRoutePoints);
    }
  };

  return (
    <>
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        initialViewState={{
          latitude: 59.9139,
          longitude: 10.7522,
          zoom: 3,
        }}
        maxZoom={20}
        minZoom={3}
        onClick={onClick}
        onLoad={() => setMapLoaded(true)}
        onDragStart={() => {
          // A manual pan detaches the camera but keeps the marker updating.
          if (trackingMode === "following") {
            setTrackingMode("located");
          }
        }}
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
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="metric" />

        {/* Terrain source */}
        <Source id="terrain-source" {...terrainSource} />

        {/* Hillshade layer for visual elevation */}
        <Layer {...hillshadeStyle} source="terrain-source" />

        <Route directions={directions} elevation={elevationData} />
        <DistanceMarkers directions={directions} />
        <Markers
          route={routePoints}
          setRoute={setRoutePoints}
          hoveredIndex={hoveredPointIndex}
          onHover={onPointHover}
          onDeletePoint={onDeletePoint}
        />
        <UserLocationMarker location={userLocation} />
        {hoveredCoordinate && <HoverMarker coordinate={hoveredCoordinate} />}
        {debugData && <RouteDebugOverlay data={debugData} />}
      </MapboxMap>
      <SearchBox mapboxToken={mapboxToken} mapRef={mapRef} />
      <LocationControl mode={trackingMode} onClick={handleLocationToggle} />
    </>
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
    "hillshade-exaggeration": 0.3,
  },
};

// Find the nearest elevation data point to a given coordinate
// Note: Hover performance is acceptable with current 30m sampling.
// If routes exceed 100km and performance degrades, consider:
// 1. Throttling onMouseMove events
// 2. Increasing sample interval for very long routes
// 3. Using spatial indexing for nearest point lookup
function findNearestElevationPoint(
  lngLat: { lng: number; lat: number },
  elevationData: Array<{
    distance: number;
    elevation: number;
    coordinate: [number, number];
  }>,
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
