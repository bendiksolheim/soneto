import { useEffect } from "react";
import type { MapRef } from "react-map-gl/mapbox";

// Lock down all map interaction while in run mode, restoring it on exit.
export function useRunModeInteractionLock(
  mapRef: React.RefObject<MapRef | null>,
  mapLoaded: boolean,
  runMode: boolean,
) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    const handlers = [
      map.dragPan,
      map.scrollZoom,
      map.boxZoom,
      map.dragRotate,
      map.keyboard,
      map.doubleClickZoom,
      map.touchZoomRotate,
    ];
    handlers.forEach((handler) => {
      if (runMode) {
        handler.disable();
      } else {
        handler.enable();
      }
    });
  }, [mapRef, runMode, mapLoaded]);
}
