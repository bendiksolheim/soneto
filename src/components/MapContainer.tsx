
import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { calculateDistance, drawRoute } from '@/utils/mapUtils';

interface MapContainerProps {
  mapboxToken: string;
  isPlanning: boolean;
  routePoints: [number, number][];
  setRoutePoints: (points: [number, number][]) => void;
  setDistance: (distance: number) => void;
  setMap: (map: any) => void;
  setShowTokenInput: (show: boolean) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  mapboxToken,
  isPlanning,
  routePoints,
  setRoutePoints,
  setDistance,
  setMap,
  setShowTokenInput,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);

  const initializeMap = async () => {
    console.log('initializeMap called');
    console.log('mapContainer.current:', mapContainer.current);
    console.log('mapboxToken:', mapboxToken);
    
    if (!mapContainer.current || !mapboxToken) {
      console.log('Early return - missing container or token');
      return;
    }

    try {
      console.log('Starting map initialization...');
      
      // Dynamically import Mapbox GL
      const mapboxgl = (await import('mapbox-gl')).default;
      
      // Import CSS
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      console.log('Mapbox GL imported successfully');
      
      mapboxgl.accessToken = mapboxToken;
      
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-122.4194, 37.7749], // San Francisco
        zoom: 13,
        pitch: 0,
      });

      console.log('Map instance created');

      // Add navigation controls
      mapInstance.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Add click handler for route planning
      mapInstance.on('click', (e: any) => {
        if (!isPlanning) return;
        
        const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const newRoutePoints = [...routePoints, newPoint];
        setRoutePoints(newRoutePoints);
        
        // Add marker for the new point
        new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(mapInstance);
        
        // Calculate distance if we have at least 2 points
        if (newRoutePoints.length >= 2) {
          const distance = calculateDistance(newRoutePoints);
          setDistance(distance);
        }
        
        // Draw route line
        if (newRoutePoints.length >= 2) {
          drawRoute(mapInstance, newRoutePoints);
        }
      });

      setMap(mapInstance);
      setShowTokenInput(false);
      toast.success('Map loaded successfully! Click "Start Planning" to begin.');
      
      console.log('Map initialization completed successfully');
      
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to load map. Please check your Mapbox token.');
    }
  };

  useEffect(() => {
    if (mapboxToken) {
      initializeMap();
    }
  }, [mapboxToken]);

  return <div ref={mapContainer} className="w-full h-full" />;
};
