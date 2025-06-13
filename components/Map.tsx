"use client";

import React from "react";
import { MapContainer } from "./MapContainer";

interface MapProps {
  mapboxToken: string;
  isPlanning: boolean;
  routePoints: [number, number][];
  setRoutePoints: (points: [number, number][]) => void;
  setDistance: (distance: number) => void;
}

export const Map: React.FC<MapProps> = ({
  mapboxToken,
  isPlanning,
  routePoints,
  setRoutePoints,
  setDistance,
}) => {
  return (
    <div className="w-full h-screen relative">
      <div className="w-full h-full">
        <MapContainer
          mapboxToken={mapboxToken}
          isPlanning={isPlanning}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          setDistance={setDistance}
        />
      </div>
    </div>
  );
};
