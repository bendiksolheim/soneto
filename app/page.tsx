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

export default function HomePage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [directions, setDirections] = useState<Array<Directions>>([]);
  const [routePoints, setRoutePoints] = useState<Array<Point>>([]);
  const [elevation, setElevation] = useState<
    Array<{ distance: number; elevation: number; coordinate: [number, number] }>
  >([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const distance = useMemo(() => {
    return directions.reduce((acc, direction) => acc + direction.routes[0].distance / 1000, 0);
  }, [directions]);
  const { routes, saveRoute, deleteRoute } = useRoutes();
  const { pace: paceInSeconds, setPace } = usePace();

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
