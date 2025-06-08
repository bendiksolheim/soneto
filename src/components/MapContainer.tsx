
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
  const markersRef = useRef<any[]>([]);

  const getRoute = async (coordinates: [number, number][]) => {
    if (coordinates.length < 2) return null;
    
    const coordinatesString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
    const query = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?geometries=geojson&access_token=${mapboxToken}`;
    
    try {
      const response = await fetch(query);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates,
          distance: route.distance / 1000 // Convert to kilometers
        };
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      toast.error('Failed to calculate route');
    }
    
    return null;
  };

  const addMarker = (map: any, lngLat: [number, number], isStart: boolean = false) => {
    const mapboxgl = (window as any).mapboxgl;
    const marker = new mapboxgl.Marker({ 
      color: isStart ? '#22c55e' : '#ef4444' 
    })
      .setLngLat(lngLat)
      .addTo(map);
    
    markersRef.current.push(marker);
    return marker;
  };

  const clearMarkersAndRoute = (map: any) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Clear existing route
    const routeId = 'route';
    if (map.getSource(routeId)) {
      map.removeLayer(routeId);
      map.removeSource(routeId);
    }
  };

  const updateRoute = async (map: any, points: [number, number][]) => {
    if (points.length === 0) {
      clearMarkersAndRoute(map);
      setDistance(0);
      return;
    }

    // Clear existing markers and route
    clearMarkersAndRoute(map);

    // Add markers for all points
    points.forEach((point, index) => {
      addMarker(map, point, index === 0);
    });

    // If we have at least 2 points, get the route
    if (points.length >= 2) {
      const routeData = await getRoute(points);
      
      if (routeData) {
        // Draw the route using the actual road coordinates
        drawRoute(map, routeData.coordinates);
        setDistance(routeData.distance);
      } else {
        // Fallback to straight line if route fails
        drawRoute(map, points);
        const fallbackDistance = calculateDistance(points);
        setDistance(fallbackDistance);
      }
    }
  };

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
      
      // Make mapboxgl available globally for marker creation
      (window as any).mapboxgl = mapboxgl;
      
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
      mapInstance.on('click', async (e: any) => {
        if (!isPlanning) return;
        
        const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const newRoutePoints = [...routePoints, newPoint];
        setRoutePoints(newRoutePoints);
        
        // Update the route with the new points
        await updateRoute(mapInstance, newRoutePoints);
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

  // Update route when routePoints change externally (e.g., clear route)
  useEffect(() => {
    const mapInstance = (window as any).currentMapInstance;
    if (mapInstance && routePoints.length === 0) {
      clearMarkersAndRoute(mapInstance);
      setDistance(0);
    }
  }, [routePoints]);

  // Store map instance globally for access in useEffect
  useEffect(() => {
    if (mapContainer.current && mapboxToken) {
      initializeMap().then(() => {
        // Store reference for cleanup operations
      });
    }
  }, [mapboxToken]);

  return <div ref={mapContainer} className="w-full h-full" />;
};
