"use client";

import { Frame } from "@/components/frame";
import { Map } from "@/components/map";
import { Share } from "@/components/widgets/share";
import { Point } from "@/lib/map/point";
import { directions, Directions } from "@/lib/mapbox";
import { useEffect, useMemo, useState } from "react";

const DRAFT_ROUTE_STORAGE_KEY = "draft-route";

interface RoutePlannerPageProps {
  initialRoute: Point[] | null;
}

export default function RoutePlannerPage({ initialRoute }: RoutePlannerPageProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [directions, setDirections] = useState<Array<Directions>>([]);
  const [elevation, setElevation] = useState<
    Array<{ distance: number; elevation: number; coordinate: [number, number] }>
  >([]);
  const [hoveredElevationIndex, setHoveredElevationIndex] = useState<number | null>(null);
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

  const distance = useMemo(() => {
    return directions.reduce((acc, direction) => acc + direction.routes[0].distance / 1000, 0);
  }, [directions]);

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

  const handleRouteLoad = (routePoints: Array<Point>) => {
    setRoutePoints(routePoints);
  };

  return (
    <Frame
      distance={distance}
      elevation={elevation}
      points={routePoints}
      onClearPoints={handleClearPoints}
      onRouteLoad={handleRouteLoad}
    >
      <Map
        mapboxToken={mapboxToken}
        routePoints={routePoints}
        setRoutePoints={setRoutePoints}
        directions={directions}
        setElevation={setElevation}
        hoveredElevationIndex={hoveredElevationIndex}
        onElevationHover={setHoveredElevationIndex}
      />
      <div className="absolute bottom-2 left-[50%] transform-[translate(-50%, 0)]">
        <Share points={routePoints} directions={directions} />
      </div>
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
    } catch (error) {
      localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
    }
  }
}
