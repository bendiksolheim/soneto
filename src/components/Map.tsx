
import React, { useState, useEffect } from 'react';
import { MapContainer } from './MapContainer';
import { TokenInput } from './TokenInput';
import { clearRouteAndMarkers } from '@/utils/mapUtils';

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
  setDistance 
}) => {
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [map, setMap] = useState<any>(null);

  // Clear route when routePoints is empty
  useEffect(() => {
    if (map && routePoints.length === 0) {
      clearRouteAndMarkers(map);
    }
  }, [routePoints, map]);

  return (
    <div className="w-full h-screen relative">
      <MapContainer
        mapboxToken={mapboxToken}
        isPlanning={isPlanning}
        routePoints={routePoints}
        setRoutePoints={setRoutePoints}
        setDistance={setDistance}
        setMap={setMap}
        setShowTokenInput={setShowTokenInput}
      />
      
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
