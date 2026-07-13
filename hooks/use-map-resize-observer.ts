import { useEffect } from "react";
import type { MapRef } from "react-map-gl/mapbox";

// Mapbox doesn't reliably resize its canvas when the planner chrome collapses
// (frame.tsx animates the container's padding + header height), so the canvas keeps
// its old size and leaves the grown right/bottom edges uncovered. Observe the
// container and resize to match — but debounce to a single resize once the size
// settles, since resizing on every animation frame reallocates the GL drawing buffer
// each frame and flickers.
export function useMapResizeObserver(mapRef: React.RefObject<MapRef | null>, mapLoaded: boolean) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => map.resize(), 40);
    });
    observer.observe(map.getContainer());
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [mapRef, mapLoaded]);
}
