
import React from 'react';

interface RouteStatsProps {
  distance: number;
}

export const RouteStats: React.FC<RouteStatsProps> = ({ distance }) => {
  const estimatedTime = (distance / 10) * 60; // Assuming 10 km/h pace, result in minutes
  
  if (distance === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg min-w-48">
        <h3 className="font-semibold text-gray-900 mb-3">Route Stats</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Distance:</span>
            <span className="font-bold text-lg text-blue-600">
              {distance.toFixed(2)} km
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Est. Time:</span>
            <span className="font-medium text-gray-900">
              {Math.round(estimatedTime)} min
            </span>
          </div>
          
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
            Based on 10 km/h pace
          </div>
        </div>
      </div>
    </div>
  );
};
