import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/map/point";

// A position fix. A superset of Point so existing callers that only read
// latitude/longitude keep working unchanged.
export type UserPosition = Point & {
  // Direction of travel in degrees clockwise from true north. Matches mapbox's
  // bearing convention directly. null when stationary or unavailable.
  heading: number | null;
  // Ground speed in m/s, or null if the device can't report it.
  speed: number | null;
  // Accuracy radius of the lat/lng fix in meters.
  accuracy: number;
  // Time of the fix (ms epoch), used to filter and rate-limit updates.
  timestamp: number;
};

type UseUserLocationOptions = {
  // Called when geolocation is unavailable or the user denies permission, so the
  // caller can reset any UI that assumed tracking was active.
  onError?: () => void;
};

type UseUserLocation = {
  location: UserPosition | null;
  isTracking: boolean;
  start: () => void;
  stop: () => void;
};

// Wraps navigator.geolocation.watchPosition to continuously track the user. The hook
// only owns the watch lifecycle — camera/follow behaviour lives with the caller.
export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocation {
  const [location, setLocation] = useState<UserPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  // Keep the latest onError in a ref so start/stop stay referentially stable.
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearWatch();
    setIsTracking(false);
    setLocation(null);
  }, [clearWatch]);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      onErrorRef.current?.();
      return;
    }

    clearWatch();
    setIsTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      () => {
        clearWatch();
        setIsTracking(false);
        setLocation(null);
        onErrorRef.current?.();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [clearWatch]);

  // Stop watching when the component using the hook unmounts.
  useEffect(() => clearWatch, [clearWatch]);

  return { location, isTracking, start, stop };
}
