
import React, { useState } from 'react';
import { Map } from '@/components/Map';
import { RouteControls } from '@/components/RouteControls';
import { RouteStats } from '@/components/RouteStats';

const Index = () => {
  const [isPlanning, setIsPlanning] = useState(false);
  const [distance, setDistance] = useState(0);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  const handleClearRoute = () => {
    setRoutePoints([]);
    setDistance(0);
    setIsPlanning(false);
  };

  const handleTogglePlanning = () => {
    setIsPlanning(!isPlanning);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Map 
        isPlanning={isPlanning}
        routePoints={routePoints}
        setRoutePoints={setRoutePoints}
        setDistance={setDistance}
      />
      
      <RouteControls 
        isPlanning={isPlanning}
        onTogglePlanning={handleTogglePlanning}
        onClearRoute={handleClearRoute}
      />
      
      <RouteStats distance={distance} />
      
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <h1 className="text-xl font-bold text-gray-900">Route Planner</h1>
          <p className="text-sm text-gray-600">Plan your perfect run</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
