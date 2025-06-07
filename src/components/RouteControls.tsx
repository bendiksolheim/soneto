
import React from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, RotateCcw } from 'lucide-react';

interface RouteControlsProps {
  isPlanning: boolean;
  onTogglePlanning: () => void;
  onClearRoute: () => void;
}

export const RouteControls: React.FC<RouteControlsProps> = ({
  isPlanning,
  onTogglePlanning,
  onClearRoute,
}) => {
  return (
    <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-3">
      <Button
        onClick={onTogglePlanning}
        className={`${
          isPlanning 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } shadow-lg transition-all duration-200 transform hover:scale-105`}
        size="lg"
      >
        <Navigation className="w-4 h-4 mr-2" />
        {isPlanning ? 'Stop Planning' : 'Start Planning'}
      </Button>
      
      <Button
        onClick={onClearRoute}
        variant="outline"
        className="bg-white/90 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg transition-all duration-200 transform hover:scale-105"
        size="lg"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Clear Route
      </Button>
    </div>
  );
};
