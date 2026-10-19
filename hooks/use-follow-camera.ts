import { useCallback, useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import type { TrackingMode } from "@/components/map/location-control";
import type { UserPosition } from "@/hooks/use-user-location";

type UseFollowCameraArgs = {
  mapRef: React.RefObject<MapRef | null>;
  userLocation: UserPosition | null;
  trackingMode: TrackingMode;
  runMode: boolean;
};

// Keep the camera on the user while following in the planner. When beginFollowSession()
// has armed a fresh session, the next fix flies in at street zoom; every other fix
// (including a resume from LOCATED) eases to the new position at the current zoom so we
// don't yank the user around. Disabled in run mode: there useSmoothFollow owns the
// camera, and this pitch-less easeTo would otherwise cancel the nav-view fly-in's tilt on
// every GPS fix.
export function useFollowCamera({
  mapRef,
  userLocation,
  trackingMode,
  runMode,
}: UseFollowCameraArgs): { beginFollowSession: () => void } {
  // Armed by beginFollowSession() when a fresh following session starts; the next GPS
  // fix flies in at street zoom and disarms it, so subsequent fixes just ease.
  const pendingFlyIn = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    const isFollowing = !runMode && trackingMode === "following";
    if (!isFollowing || !userLocation || !map) return;

    const center: [number, number] = [userLocation.longitude, userLocation.latitude];
    if (pendingFlyIn.current) {
      map.flyTo({ center, zoom: 15 });
      pendingFlyIn.current = false;
    } else {
      map.easeTo({ center, duration: 500 });
    }
  }, [mapRef, runMode, trackingMode, userLocation]);

  const beginFollowSession = useCallback(() => {
    pendingFlyIn.current = true;
  }, []);

  return { beginFollowSession };
}
