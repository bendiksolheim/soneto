"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRoutes } from "@/hooks/use-routes";
import { usePace } from "@/hooks/use-pace";
import { directions, Directions } from "@/lib/mapbox";
import { Map } from "@/components/map";
import { Point } from "@/lib/map/point";
import { CapabilitiesPanel } from "@/components/capabilities-panel";
import { directionsToGeoJson } from "@/lib/map/directions-to-geojson";
import { exportGpx } from "@/utils/gpx";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { extractRouteFromUrl } from "@/lib/route-url";

const DRAFT_ROUTE_STORAGE_KEY = "draft-route";

export default function HomePage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [directions, setDirections] = useState<Array<Directions>>([]);
  const [routePoints, setRoutePoints] = useState<Array<Point>>([]);
  const [elevation, setElevation] = useState<
    Array<{ distance: number; elevation: number; coordinate: [number, number] }>
  >([]);
  const [hoveredElevationIndex, setHoveredElevationIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const distance = useMemo(() => {
    return directions.reduce((acc, direction) => acc + direction.routes[0].distance / 1000, 0);
  }, [directions]);
  const { routes, saveRoute, deleteRoute } = useRoutes();
  const { pace: paceInSeconds, setPace } = usePace();

  // Restore draft route from localStorage on mount or load shared route from URL
  useEffect(() => {
    // First, check for shared route in URL
    const sharedRoute = extractRouteFromUrl(window.location.search);

    if (sharedRoute) {
      console.log('Loading shared route from URL:', sharedRoute.length, 'points');
      setRoutePoints(sharedRoute);

      // Clear URL parameter after loading (keeps URL clean)
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      return; // Don't load draft route if shared route exists
    }

    // Otherwise, restore draft route from localStorage
    try {
      const savedRoute = localStorage.getItem(DRAFT_ROUTE_STORAGE_KEY);
      if (savedRoute) {
        const points = JSON.parse(savedRoute);
        // Validate it's an array
        if (Array.isArray(points)) {
          setRoutePoints(points);
        }
      }
    } catch (error) {
      console.warn("Failed to restore draft route from localStorage:", error);
      // Clean up invalid data
      localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
    }
  }, []); // Empty deps - runs once on mount

  // Save draft route to localStorage whenever routePoints changes
  useEffect(() => {
    try {
      if (routePoints.length > 0) {
        localStorage.setItem(DRAFT_ROUTE_STORAGE_KEY, JSON.stringify(routePoints));
      } else {
        // Remove from storage when route is cleared
        localStorage.removeItem(DRAFT_ROUTE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to save draft route to localStorage:", error);
    }
  }, [routePoints]);

  useEffect(() => {
    async function updateDirections() {
      if (routePoints.length >= 2) {
        console.log("Fetching new directions..");
        const direction = await getRoute(routePoints, mapboxToken);
        setDirections(direction);
      } else {
        setDirections([]);
      }
    }
    updateDirections();
  }, [routePoints, mapboxToken]);

  const handleClearRoute = () => {
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
    <div className="relative h-screen overflow-hidden">
      {/* Full-width Map */}
      <Map
        mapboxToken={mapboxToken}
        routePoints={routePoints}
        setRoutePoints={setRoutePoints}
        directions={directions}
        setElevation={setElevation}
        sidebarOpen={sidebarOpen}
        hoveredElevationIndex={hoveredElevationIndex}
        onElevationHover={setHoveredElevationIndex}
      />

      {/* Overlay Capabilities Panel */}
      <div 
        className={`absolute top-0 left-0 h-full z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <CapabilitiesPanel
          routePoints={routePoints}
          distance={distance}
          elevationData={elevation}
          paceInSeconds={paceInSeconds}
          onPaceChange={setPace}
          routes={routes}
          onRouteLoad={handleRouteLoad}
          deleteRoute={deleteRoute}
          onSaveRoute={(name) => {
            saveRoute({ name, points: routePoints });
          }}
          onExportGPX={() => {
            const geojson = directionsToGeoJson(directions);
            exportGpx(geojson);
          }}
          onResetRoute={handleClearRoute}
          hoveredElevationIndex={hoveredElevationIndex}
          onElevationHover={setHoveredElevationIndex}
        />
      </div>

      {/* Toggle Button */}
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        variant="outline"
        size="icon"
        className={`fixed top-4 z-50 bg-white border-gray-300 shadow-lg hover:bg-gray-50 transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? 'left-[384px] -translate-x-1/2' 
            : 'left-4'
        }`}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </Button>
    </div>
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
