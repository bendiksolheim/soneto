"use client";

import { useEffect } from "react";

// Blocks browser page pinch-zoom on touch devices. iOS Safari ignores
// `user-scalable=no`/`maximum-scale` in the viewport meta, so we preventDefault the
// Safari-only `gesture*` events instead. This does not affect the Mapbox map, which
// reads raw touch events rather than gesture events. Gated behind a coarse-pointer
// check so desktop (incl. macOS Safari trackpad pinch) keeps normal zoom.
export function GestureLock(): null {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const preventGesture = (event: Event) => event.preventDefault();
    const events = ["gesturestart", "gesturechange", "gestureend"];
    events.forEach((event) => {
      document.addEventListener(event, preventGesture, { passive: false });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, preventGesture);
      });
    };
  }, []);

  return null;
}
