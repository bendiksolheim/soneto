import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/map/point";

type UseUserLocationOptions = {
  // Called when geolocation is unavailable or the user denies permission, so the
  // caller can reset any UI that assumed tracking was active.
  onError?: () => void;
};

type UseUserLocation = {
  location: Point | null;
  isTracking: boolean;
  start: () => void;
  stop: () => void;
};

// Wraps navigator.geolocation.watchPosition to continuously track the user. The hook
// only owns the watch lifecycle — camera/follow behaviour lives with the caller.
export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocation {
  const [location, setLocation] = useState<Point | null>(null);
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
