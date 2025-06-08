import React, { useState, useEffect } from "react";
import { MapContainer } from "./MapContainer";
import { TokenInput } from "./TokenInput";

interface MapProps {
  isPlanning: boolean;
  routePoints: [number, number][];
  setRoutePoints: (points: [number, number][]) => void;
  setDistance: (distance: number) => void;
}

export const Map: React.FC<MapProps> = ({
  isPlanning,
  routePoints,
  setRoutePoints,
  setDistance,
}) => {
  const [mapboxToken, setMapboxToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [map, setMap] = useState<unknown>(null);

  // Store map instance globally for cleanup operations
  useEffect(() => {
    if (map) {
      (window as unknown).currentMapInstance = map;
    }
  }, [map]);

  return (
    <div className="w-full h-screen relative">
      <div className="w-full h-full">
        <MapContainer
          mapboxToken={mapboxToken}
          isPlanning={isPlanning}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          setDistance={setDistance}
          setMap={setMap}
          setShowTokenInput={setShowTokenInput}
        />
      </div>

      {showTokenInput && (
        <TokenInput
          mapboxToken={mapboxToken}
          setMapboxToken={setMapboxToken}
          onLoadMap={() => {
            // The map initialization is now handled in MapContainer
            // This callback is just for the button interaction
          }}
        />
      )}
    </div>
  );
};
