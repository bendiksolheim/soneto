"use client";

import React, { useState } from "react";
import { Map } from "@/components/Map";
import { MenuBar } from "@/components/menu-bar";
import { RouteStats } from "@/components/RouteStats";
import { calculateDistance } from "@/utils/mapUtils";
import { useRoutes } from "@/hooks/use-routes";
import { usePace } from "@/hooks/use-pace";

export default function HomePage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [distance, setDistance] = useState(0);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const { routes, saveRoute, deleteRoute } = useRoutes();
  const { pace: paceInSeconds, setPace } = usePace();

  const handleClearRoute = () => {
    setRoutePoints([]);
    setDistance(0);
  };

  const handleRouteLoad = (routePoints: [number, number][], routeName: string) => {
    setRoutePoints(routePoints);
    // Calculate distance from the loaded route points
    const distance = calculateDistance(routePoints);

    setDistance(distance);
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
          isPlanning={true}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          setDistance={setDistance}
        />
      </div>
    </>
  );
}
