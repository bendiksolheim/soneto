import { useEffect, useRef, useState } from "react";
import { Marker } from "react-map-gl/mapbox";

type UserLocationMarkerProps = {
  onLocationFound: (location: Location) => void;
};

type Location = {
  latitude: number;
  longitude: number;
};

export function UserLocationMarker(props: UserLocationMarkerProps): JSX.Element {
  const { onLocationFound } = props;
  const [location, setLocation] = useState<Location | null>(null);
  const hasFoundLocation = useRef(false);

  useEffect(() => {
    if (hasFoundLocation.current) return;

    getUserLocation((position) => {
      setLocation(position.coords);
      onLocationFound(position.coords);
      hasFoundLocation.current = true;
    });
  }, [onLocationFound]);

  if (location === null) {
    return null;
  } else {
    return (
      <Marker key="user-location" longitude={location.longitude} latitude={location.latitude}>
        <div className="relative flex items-center justify-center group cursor-pointer">
          {/* Pulsing background circle */}
          <div className="absolute w-8 h-8 bg-blue-400 rounded-full opacity-20 animate-ping"></div>
          <div className="absolute w-6 h-6 bg-blue-500 rounded-full opacity-30"></div>

          {/* Main location indicator */}
          <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg">
            <div className="absolute inset-1 bg-blue-600 rounded-full"></div>
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none z-10">
            Your Current Location
          </div>
        </div>
      </Marker>
    );
  }
}

function getUserLocation(successCallback: (position: GeolocationPosition) => void) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      successCallback,
      (error) => {
        // We don’t really care if it fails, just log it
        console.warn("Could not get user location:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }
}
