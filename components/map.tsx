"use client";

import { LngLatBounds } from "mapbox-gl";
import { calculateDistance } from "@/lib/elevation/elevation-data";
import type { Point } from "@/lib/map/point";
import type { Directions } from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import dynamic from "next/dynamic";
import { useImperativeHandle, useRef, useState } from "react";
import MapboxMap, {
  type HillshadeLayerSpecification,
  Layer,
  type MapMouseEvent,
  type MapRef,
  NavigationControl,
  ScaleControl,
  Source,
} from "react-map-gl/mapbox";
import type { ElevationSample } from "@/hooks/use-elevation-profile";
import { useFollowCamera } from "@/hooks/use-follow-camera";
import { useMapResizeObserver } from "@/hooks/use-map-resize-observer";
import { useRunModeInteractionLock } from "@/hooks/use-run-mode-interaction-lock";
import { useSmoothFollow } from "@/hooks/use-smooth-follow";
import type { UserPosition } from "@/hooks/use-user-location";
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

// Imperative camera commands the parent triggers on discrete events (a route being
// loaded, run mode being exited) instead of syncing them through a prop + effect.
export type RunMapHandle = {
  // Frame the camera around the given route points.
  fitRouteBounds: (points: Array<Point>) => void;
  // Return to the flat, north-up planner view (used when leaving run mode).
  resetCamera: () => void;
  // Arm the fly-in so the next GPS fix of a fresh following session zooms in.
  // Called by the parent on the off -> following transition (a resume from
  // "located" deliberately skips this and keeps the current zoom).
  beginFollowSession: () => void;
};

interface MapContainerProps {
  mapboxToken: string;
  routePoints: Array<Point>;
  setRoutePoints: (points: Array<Point>) => void;
  directions: Array<Directions>;
  // Elevation profile for the current route, used to highlight the hovered point.
  elevation: Array<ElevationSample>;
  hoveredElevationIndex: number | null;
  onElevationHover: (index: number | null) => void;
  hoveredPointIndex: number | null;
  onPointHover: (index: number | null) => void;
  onDeletePoint: (index: number) => void;
  debugData?: RouteDebugData | null;
  // When true, the map becomes a locked-down follow-me view: interaction is
  // disabled, planner chrome is hidden, and the camera follows the user.
  runMode?: boolean;
  // The user's live GPS position, owned by the parent (which also feeds it to
  // Auto-Route). null until tracking starts.
  userLocation: UserPosition | null;
  // Location-tracking UI state and its toggle, owned by the parent.
  trackingMode: TrackingMode;
  onLocationToggle: () => void;
  // Called when the user manually pans the map, so the parent can detach the follow
  // camera (following -> located).
  onManualPan: () => void;
  // Smoothed device-compass heading (degrees clockwise from north), owned by the
  // parent so the permission prompt can be triggered from the user's gesture. Used
  // to rotate the follow camera instantly when the user turns.
  headingRef?: React.RefObject<number | null>;
  // Imperative handle for parent-triggered camera commands.
  ref?: React.Ref<RunMapHandle>;
}

export function RunMap({
  mapboxToken,
  routePoints,
  setRoutePoints,
  directions,
  elevation,
  hoveredElevationIndex,
  onElevationHover,
  hoveredPointIndex,
  onPointHover,
  onDeletePoint,
  debugData,
  runMode = false,
  userLocation,
  trackingMode,
  onLocationToggle,
  onManualPan,
  headingRef,
  ref,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  // Fit the initial route (loaded from URL/localStorage before mount) exactly once,
  // when the map first reports ready.
  const hasFittedInitial = useRef(false);

  // The compass heading is owned by the parent (so iOS permission can be requested
  // from a user gesture); fall back to a local empty ref when not provided.
  const fallbackHeadingRef = useRef<number | null>(null);
  const activeHeadingRef = headingRef ?? fallbackHeadingRef;

  // Smoothly interpolate the follow camera + marker between the ~1Hz GPS fixes so
  // run-mode tracking looks live rather than jumping once per second.
  const { renderedPosition, renderedBearing } = useSmoothFollow({
    mapRef,
    position: userLocation,
    headingRef: activeHeadingRef,
    enabled: runMode,
    ready: mapLoaded,
  });

  const { beginFollowSession } = useFollowCamera({ mapRef, userLocation, trackingMode, runMode });

  useImperativeHandle(
    ref,
    () => ({
      fitRouteBounds: (points: Array<Point>) => {
        if (mapRef.current) fitBoundsToPoints(mapRef.current, points);
      },
      // Leaving run mode: ease back to the flat, north-up planner view. (Entering is
      // handled by useSmoothFollow's fly-in; it doesn't reset the camera on exit.)
      resetCamera: () => {
        mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 500 });
      },
      beginFollowSession,
    }),
    [beginFollowSession],
  );

  useMapResizeObserver(mapRef, mapLoaded);
  useRunModeInteractionLock(mapRef, mapLoaded, runMode);

  const hoveredCoordinate = coordinateAt(elevation, hoveredElevationIndex);

  // In run mode we flatten the terrain (exaggeration 0). The follow camera looks at the
  // ground at a steep pitch, and draping the route onto 3D terrain let hills occlude the
  // line and made it snap to the coarse, overzoomed DEM facets — so the route appeared to
  // "drop" or skew at crests. A flat surface keeps the route fully visible. Elevation
  // colouring is unaffected (it uses separately-fetched data) and the hillshade layer still
  // shades the map; the planning view keeps the 3D terrain.
  const terrain = { source: "terrain-source", exaggeration: runMode ? 0 : 0.5 };

  const onClick = (e: MapMouseEvent) => {
    // Run mode is read-only — never add points by tapping the map.
    if (runMode) return;
    // Use unproject to get more accurate coordinates with terrain enabled, falling back
    // to the event's own coordinates if the map isn't available.
    const { lat, lng } = mapRef.current?.unproject(e.point) ?? e.lngLat;
    setRoutePoints([...routePoints, { latitude: lat, longitude: lng }]);
  };

  const onMouseMove = (e: MapMouseEvent) => {
    const index = elevationIndexUnderCursor(e, elevation);
    if (index !== hoveredElevationIndex) onElevationHover(index);
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
        onLoad={() => {
          setMapLoaded(true);
          // Frame the route we mounted with (from URL/localStorage) once the map is ready.
          if (!hasFittedInitial.current && mapRef.current) {
            hasFittedInitial.current = true;
            fitBoundsToPoints(mapRef.current, routePoints);
          }
        }}
        onDragStart={onManualPan}
        terrain={terrain}
        onMouseMove={onMouseMove}
        interactiveLayerIds={["route-layer"]}
      >
        {!runMode && (
          <>
            <NavigationControl position="bottom-right" />
            <ScaleControl position="bottom-left" unit="metric" />
          </>
        )}

        {/* Terrain source */}
        <Source id="terrain-source" {...terrainSource} />

        {/* Hillshade layer for visual elevation */}
        <Layer {...hillshadeStyle} source="terrain-source" />

        {/* The planned route stays visible as a guide, even in run mode. */}
        <Route directions={directions} elevation={elevation} />
        <DistanceMarkers directions={directions} />
        {!runMode && (
          <Markers
            route={routePoints}
            setRoute={setRoutePoints}
            hoveredIndex={hoveredPointIndex}
            onHover={onPointHover}
            onDeletePoint={onDeletePoint}
          />
        )}
        <UserLocationMarker
          location={runMode ? (renderedPosition ?? userLocation) : userLocation}
          bearing={runMode ? renderedBearing : undefined}
        />
        {!runMode && (
          <>
            {hoveredCoordinate && <HoverMarker coordinate={hoveredCoordinate} />}
            {debugData && <RouteDebugOverlay data={debugData} />}
          </>
        )}
      </MapboxMap>
      {!runMode && (
        <>
          <SearchBox mapboxToken={mapboxToken} mapRef={mapRef} />
          <LocationControl mode={trackingMode} onClick={onLocationToggle} />
        </>
      )}
    </>
  );
}

// Coordinate of the elevation sample at `index`, or null when nothing is hovered or the
// index is out of range for the current profile.
function coordinateAt(
  elevation: Array<ElevationSample>,
  index: number | null,
): [number, number] | null {
  if (index === null) return null;
  return elevation[index]?.coordinate ?? null;
}

// Index of the elevation sample nearest the cursor while it's over the route line, or
// null when the cursor isn't on the route.
function elevationIndexUnderCursor(
  e: MapMouseEvent,
  elevation: Array<ElevationSample>,
): number | null {
  const features = e.target.queryRenderedFeatures(e.point, { layers: ["route-layer"] });
  if (features.length === 0) return null;
  return findNearestElevationPoint(e.lngLat, elevation);
}

// Frame the camera around a set of route points. Pure given the map instance, so it lives
// at module scope (no per-render identity, no memoization needed) and is shared by the
// imperative fitRouteBounds handle and the initial onLoad fit.
function fitBoundsToPoints(map: MapRef, points: Array<Point>) {
  if (points.length < 2) return;

  const bounds = new LngLatBounds();
  points.forEach((point) => {
    bounds.extend([point.longitude, point.latitude]);
  });

  map.fitBounds(bounds, {
    padding: 50,
    maxZoom: 16,
    duration: 1000,
  });
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
