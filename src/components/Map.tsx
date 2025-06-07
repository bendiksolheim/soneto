import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [map, setMap] = useState<any>(null);

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
          calculateDistance(newRoutePoints);
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

  const calculateDistance = (points: [number, number][]) => {
    let totalDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
      const [lng1, lat1] = points[i - 1];
      const [lng2, lat2] = points[i];
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      totalDistance += distance;
    }
    
    setDistance(totalDistance);
  };

  const drawRoute = (mapInstance: any, points: [number, number][]) => {
    const routeId = 'route';
    
    // Remove existing route if it exists
    if (mapInstance.getSource(routeId)) {
      mapInstance.removeLayer(routeId);
      mapInstance.removeSource(routeId);
    }
    
    // Add new route
    mapInstance.addSource(routeId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: points
        }
      }
    });

    mapInstance.addLayer({
      id: routeId,
      type: 'line',
      source: routeId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ef4444',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  };

  // Clear route when routePoints is empty
  useEffect(() => {
    if (map && routePoints.length === 0) {
      // Clear markers and route
      const routeId = 'route';
      if (map.getSource(routeId)) {
        map.removeLayer(routeId);
        map.removeSource(routeId);
      }
      
      // Remove all markers (this is a simplified approach)
      const markers = document.querySelectorAll('.mapboxgl-marker');
      markers.forEach(marker => marker.remove());
    }
  }, [routePoints, map]);

  if (showTokenInput) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Map</h2>
            <p className="text-gray-600">Enter your Mapbox public token to get started</p>
          </div>
          
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIi..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="w-full"
            />
            
            <Button 
              onClick={() => {
                console.log('Load Map button clicked');
                initializeMap();
              }}
              disabled={!mapboxToken}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Load Map
            </Button>
            
            <div className="text-sm text-gray-500 text-center">
              <p>Get your free token at{' '}
                <a 
                  href="https://mapbox.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
