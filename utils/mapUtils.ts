export const calculateDistance = (points: [number, number][]): number => {
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
  
  return totalDistance;
};

export const drawRoute = (mapInstance: any, coordinates: [number, number][]) => {
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
        coordinates: coordinates
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

export const clearRouteAndMarkers = (map: any) => {
  const routeId = 'route';
  if (map.getSource(routeId)) {
    map.removeLayer(routeId);
    map.removeSource(routeId);
  }
  
  // Remove all markers (this is a simplified approach)
  const markers = document.querySelectorAll('.mapboxgl-marker');
  markers.forEach(marker => marker.remove());
};