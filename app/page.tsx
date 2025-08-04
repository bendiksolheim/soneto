"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MenuBar } from "@/components/menu-bar";
import { useRoutes } from "@/hooks/use-routes";
import { usePace } from "@/hooks/use-pace";
import { directions, Directions } from "@/lib/mapbox";
import { Map } from "@/components/map";
import { RouteActions } from "@/components/route-actions";
import { Point } from "@/lib/map/point";
import { ElevationProfile } from "@/components/elevation-profile";
import { directionsToGeoJson } from "@/lib/map/directions-to-geojson";
import { exportGpx } from "@/utils/gpx";

export default function HomePage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [directions, setDirections] = useState<Array<Directions>>([]);
  const [routePoints, setRoutePoints] = useState<Array<Point>>([]);
  const [elevation, setElevation] = useState<
    Array<{ distance: number; elevation: number; coordinate: [number, number] }>
  >([]);

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
  }, [routePoints]);

  const handleClearRoute = () => {
    setRoutePoints([]);
  };

  const handleRouteLoad = (routePoints: Array<Point>, routeName: string) => {
    setRoutePoints(routePoints);
  };

  return (
    <>
      <MenuBar
        paceInSeconds={paceInSeconds}
        distance={distance}
        onRouteLoad={handleRouteLoad}
        routes={routes}
        deleteRoute={deleteRoute}
        onPaceChange={setPace}
      />
      <div className="relative w-full h-screen overflow-hidden">
        <Map
          mapboxToken={mapboxToken}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          directions={directions}
          setElevation={setElevation}
        />
        <ElevationProfile
          elevationData={elevation}
          totalDistance={directions.length > 0 ? directions[0].routes[0].distance : 0}
          isVisible={elevation.length > 0}
        />
        <RouteActions
          onSaveRoute={(name) => {
            saveRoute({ name, points: routePoints });
          }}
          onExportGPX={() => {
            const geojson = directionsToGeoJson(directions);
            exportGpx(geojson);
          }}
          onResetRoute={handleClearRoute}
          isVisible={routePoints.length > 0}
        />
      </div>
    </>
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
