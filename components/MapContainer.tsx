"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Map, {
  GeolocateControl,
  MapMouseEvent,
  NavigationControl,
  Marker,
  Source,
  Layer,
  LineLayerSpecification,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapContainerProps {
  mapboxToken: string;
  isPlanning: boolean;
  routePoints: [number, number][];
  setRoutePoints: (points: [number, number][]) => void;
  setDistance: (distance: number) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  mapboxToken,
  isPlanning,
  routePoints,
  setRoutePoints,
  setDistance,
}) => {
  const [route, setRoute] = useState<{ coordinates: [number, number][]; distance: number } | null>(
    null,
  );
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: 59.9139,
    longitude: 10.7522,
    zoom: 10,
  });

  // Update route when routePoints change
  useEffect(() => {
    const updateRoute = async () => {
      if (routePoints.length >= 2) {
        setIsCalculatingRoute(true);
        const newRoute = await getMegaRoute(routePoints, mapboxToken);
        if (newRoute) {
          setDistance(newRoute.distance);
          setRoute(newRoute);
        }
        setIsCalculatingRoute(false);
      } else {
        setRoute(null);
        setDistance(0);
        setIsCalculatingRoute(false);
      }
    };

    updateRoute();
  }, [routePoints, mapboxToken, setDistance]);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setViewState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            zoom: 13,
          });
        },
        (error) => {
          console.warn("Could not get user location:", error);
          // Keep default location if geolocation fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    }
  }, []);

  const onClick = async (e: MapMouseEvent) => {
    if (!isPlanning) return;

    const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    const newRoutePoints = [...routePoints, newPoint];
    setRoutePoints(newRoutePoints);
  };

  const handleMarkerClick = (indexToRemove: number, e: any) => {
    // Prevent the map's onClick from firing
    e.originalEvent?.stopPropagation();

    // Remove the point at the specified index
    const newRoutePoints = routePoints.filter((_, index) => index !== indexToRemove);
    setRoutePoints(newRoutePoints);
  };

  const handleMarkerDrag = (index: number, event: any) => {
    const { lng, lat } = event.lngLat;
    const newRoutePoints = [...routePoints];
    newRoutePoints[index] = [lng, lat];
    setRoutePoints(newRoutePoints);
  };

  const points = useMemo(() => {
    return routePoints.map((point, index) => (
      <Marker
        key={`route-${index}`}
        longitude={point[0]}
        latitude={point[1]}
        draggable
        onClick={(e) => handleMarkerClick(index, e)}
        onDragEnd={(e) => handleMarkerDrag(index, e)}
      >
        <div
          className="relative cursor-pointer group"
          style={{
            width: "10px",
            height: "10px",
          }}
        >
          {/* Marker pin */}
          <div
            className={`
            ${index === 0 || index === routePoints.length - 1 ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}
            rounded-full border border-white shadow-lg
            ${index === 0 ? "bg-green-500" : index === routePoints.length - 1 ? "bg-red-500" : "bg-blue-500"}
            group-hover:scale-110 transition-transform duration-200
            flex items-center justify-center
          `}
          >
            {index === 0 ? (
              <span className="text-white text-[8px] font-bold ml-0.5">▶</span>
            ) : index === routePoints.length - 1 ? (
              <span className="text-white text-[8px] font-bold">⚑</span>
            ) : null}
          </div>

          {/* Hover tooltip */}
          <div
            className="
            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap
            pointer-events-none z-10
          "
          >
            {index === 0 ? "Start" : index === routePoints.length - 1 ? "Finish" : "Waypoint"} •
            Click to remove • Drag to move
          </div>
        </div>
      </Marker>
    ));
  }, [routePoints]);

  const routeGeoJson: GeoJSON.GeoJSON = useMemo(() => {
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route !== null ? route.coordinates : [],
      },
    };
  }, [route]);

  return (
    <div className="w-full h-full relative">
      {isCalculatingRoute && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Calculating route...</span>
          </div>
        </div>
      )}
      <Map
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        maxZoom={20}
        minZoom={3}
        onClick={onClick}
      >
        <Source type="geojson" data={routeGeoJson}>
          <Layer {...style} />
        </Source>
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />
        {points}
      </Map>
    </div>
  );
};

const style: Omit<LineLayerSpecification, "source"> = {
  id: "data",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#ef4444",
    "line-width": 4,
    "line-opacity": 0.8,
  },
};

async function getRoute(
  coordinates: [number, number][],
  mapboxToken: string,
): Promise<{ coordinates: [number, number][]; distance: number } | null> {
  if (coordinates.length < 2) return null;

  const coordinatesString = coordinates.map((coord) => `${coord[0]},${coord[1]}`).join(";");
  const query = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?overview=full&geometries=geojson&access_token=${mapboxToken}`;

  try {
    const response = await fetch(query);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates,
        distance: route.distance / 1000, // Convert to kilometers
      };
    }
  } catch (error) {
    console.error("Error fetching route:", error);
    toast.error("Failed to calculate route");
  }

  return null;
}

async function getMegaRoute(
  coordinates: [number, number][],
  mapboxToken: string,
): Promise<{ coordinates: [number, number][]; distance: number } | null> {
  if (coordinates.length < 2) return null;

  // If 25 or fewer waypoints, use the regular route function
  if (coordinates.length <= 25) {
    return getRoute(coordinates, mapboxToken);
  }

  const segments: { coordinates: [number, number][]; distance: number }[] = [];
  const maxWaypoints = 25;
  const numSegments = Math.ceil((coordinates.length - 1) / (maxWaypoints - 1));

  console.log(`Splitting ${coordinates.length} waypoints into ${numSegments} segments`);

  // Split into chunks with overlap to ensure continuity
  for (let i = 0; i < coordinates.length - 1; i += maxWaypoints - 1) {
    const endIndex = Math.min(i + maxWaypoints, coordinates.length);
    const chunk = coordinates.slice(i, endIndex);
    const segmentNumber = Math.floor(i / (maxWaypoints - 1)) + 1;

    console.log(
      `Processing segment ${segmentNumber}/${numSegments} with ${chunk.length} waypoints`,
    );

    try {
      const segment = await getRoute(chunk, mapboxToken);
      if (segment) {
        segments.push(segment);
        console.log(`Segment ${segmentNumber} completed: ${segment.distance.toFixed(2)}km`);
      } else {
        console.error(`Failed to get route for segment ${segmentNumber}`);
        return null;
      }
    } catch (error) {
      console.error(`Error processing segment ${segmentNumber}:`, error);
      return null;
    }

    // Add small delay to avoid rate limiting
    if (i + maxWaypoints - 1 < coordinates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (segments.length === 0) return null;

  // Combine all segments
  const allCoordinates: [number, number][] = [];
  let totalDistance = 0;

  segments.forEach((segment, index) => {
    if (index === 0) {
      // First segment: include all coordinates
      allCoordinates.push(...segment.coordinates);
    } else {
      // Subsequent segments: skip first coordinate to avoid duplication
      allCoordinates.push(...segment.coordinates.slice(1));
    }
    totalDistance += segment.distance;
  });

  console.log(`Route calculation completed: ${totalDistance.toFixed(2)}km total distance`);

  return { coordinates: allCoordinates, distance: totalDistance };
}
