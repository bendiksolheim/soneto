"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/base/button";
import { Frame } from "@/components/frame";
import { RunMap } from "@/components/map";
import { RunModeOverlay } from "@/components/map/run-mode-overlay";
import { Share } from "@/components/widgets/share";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useFadeTransition } from "@/hooks/use-fade-transition";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import type { UserPosition } from "@/hooks/use-user-location";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { PlayIcon } from "@/icons";
import type { Point } from "@/lib/map/point";
import { computeWaypointDistances } from "@/lib/map/waypoint-distances";
import { type Directions, directions } from "@/lib/mapbox";
import type { GenerateRouteResult, RouteDebugData } from "@/lib/routes";

const DRAFT_ROUTE_STORAGE_KEY = "draft-route";

interface RoutePlannerPageProps {
  initialRoute: Point[] | null;
}

export default function RoutePlannerPage({ initialRoute }: RoutePlannerPageProps) {
  // Mapbox public (pk.) tokens are designed to ship in the browser bundle and are
  // restricted by URL, so this NEXT_PUBLIC_ name is not a leaked secret.
  // react-doctor-disable-next-line react-doctor/public-env-secret-name
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [directions, setDirections] = useState<Array<Directions>>([]);
  const [elevation, setElevation] = useState<
    Array<{ distance: number; elevation: number; coordinate: [number, number] }>
  >([]);
  const [hoveredElevationIndex, setHoveredElevationIndex] = useState<number | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<UserPosition | null>(null);
  const [debugData, setDebugData] = useState<RouteDebugData | null>(null);
  const [runMode, setRunMode] = useState(false);

  const autoRouteEnabled = useFeatureFlag("autoroute");
  const showRunButton = useFeatureFlag("show-run-button");

  const wakeLock = useWakeLock();
  const deviceHeading = useDeviceHeading();
  // Crossfade between the planner overlays (run/share buttons) and the run-mode overlay.
  const plannerUi = useFadeTransition(!runMode, 250);
  const runUi = useFadeTransition(runMode, 250);
  const [routePoints, setRoutePoints] = useState<Array<Point>>(() => {
    if (initialRoute && initialRoute.length > 0) {
      return initialRoute;
    }

    const savedRoute = loadRouteFromLocalStorage();
    if (savedRoute) {
      return savedRoute;
    } else {
      return [];
    }
  });

  // Fit bounds on mount when we loaded an initial route (from URL or localStorage).
  const [shouldFitBounds, setShouldFitBounds] = useState(() => routePoints.length >= 2);

  const distance = directions.reduce(
    (acc, direction) => acc + direction.routes[0].distance / 1000,
    0,
  );

  const pointDistances = computeWaypointDistances(directions);

  // Clean up URL if route was loaded from URL parameter
  useEffect(() => {
    if (
      initialRoute &&
      typeof window !== "undefined" &&
      window.location.search.includes("route=")
    ) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [initialRoute]);

  // Save draft route to localStorage whenever routePoints changes
  useEffect(() => {
    try {
      if (routePoints.length > 0) {
        localStorage.setItem(DRAFT_ROUTE_STORAGE_KEY, JSON.stringify(routePoints));
      } else {
        localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to save draft route to localStorage:", error);
    }
  }, [routePoints]);

  // Fetch directions when route points change
  useEffect(() => {
    async function updateDirections() {
      if (routePoints.length >= 2) {
        const direction = await getRoute(routePoints, mapboxToken);
        setDirections(direction);
      } else {
        setDirections([]);
      }
    }
    updateDirections();
  }, [routePoints, mapboxToken]);

  const handleClearPoints = () => {
    setRoutePoints([]);
    try {
      localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear draft route from localStorage:", error);
    }
  };

  const handleDeletePoint = (index: number) => {
    setRoutePoints(routePoints.filter((_, i) => i !== index));
  };

  const handleRouteLoad = (routePoints: Array<Point>) => {
    setRoutePoints(routePoints);
    setShouldFitBounds(true);
  };

  const handleAutoRouteGenerated = (result: GenerateRouteResult) => {
    setRoutePoints(result.points);
    setShouldFitBounds(true);
  };

  const enterRunMode = () => {
    setRunMode(true);
    wakeLock.request();
    // Must run from this click so iOS allows the compass permission prompt.
    deviceHeading.start();
  };

  const exitRunMode = () => {
    setRunMode(false);
    wakeLock.release();
    deviceHeading.stop();
  };

  return (
    <Frame
      distance={distance}
      elevation={elevation}
      points={routePoints}
      pointDistances={pointDistances}
      hoveredPointIndex={hoveredPointIndex}
      onPointHover={setHoveredPointIndex}
      onDeletePoint={handleDeletePoint}
      onClearPoints={handleClearPoints}
      onRouteLoad={handleRouteLoad}
      autoRouteEnabled={autoRouteEnabled}
      mapboxToken={mapboxToken}
      userLocation={userLocation}
      onAutoRouteGenerated={handleAutoRouteGenerated}
      onAutoRouteDebugChanged={setDebugData}
      hideChrome={runMode}
    >
      <RunMap
        mapboxToken={mapboxToken}
        routePoints={routePoints}
        setRoutePoints={setRoutePoints}
        directions={directions}
        setElevation={setElevation}
        hoveredElevationIndex={hoveredElevationIndex}
        onElevationHover={setHoveredElevationIndex}
        hoveredPointIndex={hoveredPointIndex}
        onPointHover={setHoveredPointIndex}
        onDeletePoint={handleDeletePoint}
        shouldFitBounds={shouldFitBounds}
        onFitBoundsComplete={() => setShouldFitBounds(false)}
        onUserLocationFound={setUserLocation}
        debugData={debugData}
        runMode={runMode}
        onExitRunMode={exitRunMode}
        headingRef={deviceHeading.headingRef}
      />
      {plannerUi.mounted && showRunButton && (
        <div
          className={`absolute bottom-14 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-[250ms] ease-in-out ${
            plannerUi.visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Button size="md" className="shadow-lg gap-2" onClick={enterRunMode}>
            <PlayIcon size={18} />
            Run
          </Button>
        </div>
      )}
      {plannerUi.mounted && (
        <div
          className={`absolute bottom-2 left-[50%] transform-[translate(-50%, 0)] transition-opacity duration-[250ms] ease-in-out ${
            plannerUi.visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Share points={routePoints} directions={directions} />
        </div>
      )}
      {runUi.mounted && <RunModeOverlay onExit={exitRunMode} visible={runUi.visible} />}
    </Frame>
  );
}

async function getRoute(
  coordinates: Array<Point>,
  mapboxToken: string,
): Promise<Array<Directions>> {
  if (coordinates.length <= 25) {
    const direction = await directions(coordinates, mapboxToken);
    return [direction];
  } else {
    const allDirections: Array<Directions> = [];
    const maxWaypoints = 25;

    for (let i = 0; i < coordinates.length - 1; i += maxWaypoints - 1) {
      const endIndex = Math.min(i + maxWaypoints, coordinates.length);
      const chunk = coordinates.slice(i, endIndex);

      const response = await directions(chunk, mapboxToken);
      allDirections.push(response);

      if (i + maxWaypoints - 1 < coordinates.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return allDirections;
  }
}

function loadRouteFromLocalStorage(): Array<Point> | null {
  if (typeof window !== "undefined") {
    try {
      const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
      if (savedRoute) {
        const points = JSON.parse(savedRoute);
        if (Array.isArray(points) && points.length > 0) {
          return points;
        }
      }
    } catch (_error) {
      localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
    }
  }
}
