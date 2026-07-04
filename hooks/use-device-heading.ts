import { useCallback, useEffect, useRef, useState } from "react";
import { lerpAngle, normalizeBearing } from "@/lib/map/geo";

// How aggressively each new compass reading pulls the smoothed value toward it.
// Higher = more responsive but jitterier; lower = smoother but laggier.
const SMOOTHING = 0.25;

type UseDeviceHeading = {
  // Smoothed compass heading in degrees clockwise from true north, or null when no
  // reading has arrived yet. Exposed as a ref so the follow loop can read it every
  // frame without triggering re-renders.
  headingRef: React.RefObject<number | null>;
  // Whether the device exposes an orientation/compass API at all.
  isSupported: boolean;
  // Begins listening. On iOS this must be called from a user gesture so the
  // permission prompt is allowed; elsewhere it just attaches the listener.
  start: () => Promise<void>;
  stop: () => void;
};

// iOS 13+ gates DeviceOrientation behind an explicit, gesture-triggered permission.
type DeviceOrientationEventIOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

// iOS exposes a ready-made compass heading; other browsers only give raw alpha.
type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };

// Converts a raw orientation event into a true-north bearing (degrees clockwise),
// or null if the event carries no usable heading.
function readCompassHeading(event: CompassEvent): number | null {
  // iOS: already a true-north compass heading, clockwise.
  if (typeof event.webkitCompassHeading === "number") {
    return normalizeBearing(event.webkitCompassHeading);
  }

  // Others: alpha increases counter-clockwise, so the compass heading is 360 - alpha.
  // Correct for the current screen orientation so a landscape phone still points right.
  if (event.alpha !== null && event.absolute) {
    const screenAngle = window.screen?.orientation?.angle ?? 0;
    return normalizeBearing(360 - event.alpha + screenAngle);
  }

  return null;
}

// Tracks the device compass heading for the run-mode follow camera, so the map can
// rotate to the way the user is facing the instant they turn — independent of the
// laggy, sometimes-null GPS heading. No-ops gracefully where unsupported.
export function useDeviceHeading(): UseDeviceHeading {
  const headingRef = useRef<number | null>(null);
  const listening = useRef(false);
  const [isSupported] = useState(
    () => typeof window !== "undefined" && "DeviceOrientationEvent" in window,
  );

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const reading = readCompassHeading(event);
    if (reading === null) return;
    headingRef.current =
      headingRef.current === null ? reading : lerpAngle(headingRef.current, reading, SMOOTHING);
  }, []);

  // Prefer the absolute (true-north referenced) event where available, falling back
  // to the relative one for browsers that only fire "deviceorientation".
  const attach = useCallback(() => {
    if (listening.current) return;
    listening.current = true;
    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);
  }, [handleOrientation]);

  const detach = useCallback(() => {
    listening.current = false;
    window.removeEventListener("deviceorientationabsolute", handleOrientation);
    window.removeEventListener("deviceorientation", handleOrientation);
  }, [handleOrientation]);

  const start = useCallback(async () => {
    if (!isSupported) return;

    const orientationEvent = DeviceOrientationEvent as DeviceOrientationEventIOS;
    if (typeof orientationEvent.requestPermission === "function") {
      try {
        const result = await orientationEvent.requestPermission();
        if (result !== "granted") return;
      } catch {
        // Denied, or not called from a gesture — fall back to GPS heading silently.
        return;
      }
    }

    attach();
  }, [isSupported, attach]);

  const stop = useCallback(() => {
    detach();
    headingRef.current = null;
  }, [detach]);

  // Clean up the listener if the component unmounts mid-run.
  useEffect(() => detach, [detach]);

  return { headingRef, isSupported, start, stop };
}
