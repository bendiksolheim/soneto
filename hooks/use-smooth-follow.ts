import { useCallback, useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import type { UserPosition } from "@/hooks/use-user-location";
import { calculateDistance } from "@/lib/elevation/elevation-data";
import { bearingBetween, clamp, easeOutCubic, lerpAngle, lerpLngLat } from "@/lib/map/geo";
import type { Point } from "@/lib/map/point";

// How long the camera takes to glide onto each new fix. Kept just under the ~1s GPS
// fix interval so it has essentially caught up by the time the next fix arrives.
const CATCH_UP_MS = 900;
// Per-frame fraction the bearing eases toward its target — fast enough to feel
// instant when the user turns, smooth enough to hide compass jitter.
const BEARING_LERP = 0.15;
// Don't chase a new center until the intro fly-in has finished.
const INTRO_MS = 1000;
// Publish the rendered position to React state at ~30Hz; the camera itself is moved
// imperatively every frame, so the marker doesn't need a 60fps setState storm.
const PUBLISH_INTERVAL_MS = 33;
// Fixes less accurate than this (metres) are GPS noise; keep aiming at the last good
// fix rather than letting the camera chase the wobble.
const MAX_ACCURACY_METERS = 25;
// A jump larger than this between consecutive fixes is a GPS teleport, not running.
// Snap to it instead of sweeping the camera across the map.
const TELEPORT_METERS = 100;
// Below this much movement we treat the user as stationary and don't derive a bearing
// from the (meaningless) direction between two near-identical points.
const MIN_BEARING_MOVE_METERS = 1;

const NAV_PITCH = 55;
const NAV_ZOOM = 17.5;

type UseSmoothFollowArgs = {
  mapRef: React.RefObject<MapRef | null>;
  position: UserPosition | null;
  headingRef: React.RefObject<number | null>;
  enabled: boolean;
  // The map must be loaded before we can drive its camera.
  ready: boolean;
};

type UseSmoothFollow = {
  // Interpolated position for the marker; null until the first fix while following.
  renderedPosition: Point | null;
  // Interpolated bearing the marker arrow should point.
  renderedBearing: number;
};

// Drives a continuous follow camera in run mode: a single requestAnimationFrame loop
// interpolates the camera (and the marker we publish) between the discrete ~1Hz GPS
// fixes, so motion looks live at 60fps instead of jumping once per second. Replaces
// the old per-fix easeTo follow effect.
export function useSmoothFollow({
  mapRef,
  position,
  headingRef,
  enabled,
  ready,
}: UseSmoothFollowArgs): UseSmoothFollow {
  const [renderedPosition, setRenderedPosition] = useState<Point | null>(null);
  const [renderedBearing, setRenderedBearing] = useState(0);

  // Interpolation segment: animate from `from` to `to` starting at `fixTime`.
  const fromRef = useRef<[number, number] | null>(null);
  const toRef = useRef<[number, number] | null>(null);
  const fixTimeRef = useRef(0);
  // Where the camera currently sits, so a new fix starts its glide from the visible
  // position rather than snapping back to the previous target.
  const renderedRef = useRef<[number, number] | null>(null);
  // Latest usable GPS heading, used when the compass is unavailable.
  const gpsHeadingRef = useRef<number | null>(null);
  // Current smoothed bearing the camera is rendered at.
  const bearingRef = useRef(0);
  // performance.now() until which the intro fly-in owns the camera.
  const introEndRef = useRef(0);
  const lastPublishRef = useRef(0);

  // Reset all follow state when a session starts/ends so re-entering run mode flies in
  // afresh and leaving stops publishing a stale marker.
  useEffect(() => {
    if (enabled) {
      fromRef.current = null;
      toRef.current = null;
      renderedRef.current = null;
      gpsHeadingRef.current = null;
      bearingRef.current = 0;
      introEndRef.current = 0;
      lastPublishRef.current = 0;
    } else {
      setRenderedPosition(null);
    }
  }, [enabled]);

  const publish = useCallback((center: [number, number], bearing: number, now: number) => {
    if (now - lastPublishRef.current < PUBLISH_INTERVAL_MS) return;
    lastPublishRef.current = now;
    setRenderedPosition({ longitude: center[0], latitude: center[1] });
    setRenderedBearing(bearing);
  }, []);

  // Retarget the interpolation on each new fix. Runs independently of the rAF loop so
  // a fresh fix never restarts the animation; it just moves the goalposts.
  useEffect(() => {
    if (!enabled || !position) return;
    const map = mapRef.current;
    if (!map) return;

    const coord: [number, number] = [position.longitude, position.latitude];
    const now = performance.now();

    // First fix: fly in to the nav view; the loop holds off until INTRO_MS elapses.
    if (toRef.current === null) {
      const initialBearing = headingRef.current ?? position.heading ?? 0;
      bearingRef.current = initialBearing;
      fromRef.current = coord;
      toRef.current = coord;
      renderedRef.current = coord;
      fixTimeRef.current = now;
      introEndRef.current = now + INTRO_MS;
      map.flyTo({
        center: coord,
        bearing: initialBearing,
        pitch: NAV_PITCH,
        zoom: NAV_ZOOM,
        duration: INTRO_MS,
      });
      return;
    }

    // Ignore noisy fixes; keep gliding toward the last good target.
    if (position.accuracy > MAX_ACCURACY_METERS) return;

    if (position.heading !== null && !Number.isNaN(position.heading)) {
      gpsHeadingRef.current = position.heading;
    }

    const jumpMeters = calculateDistance(toRef.current, coord) * 1000;
    if (jumpMeters > TELEPORT_METERS) {
      // GPS teleport — snap rather than sweep across the map.
      fromRef.current = coord;
      renderedRef.current = coord;
    } else {
      fromRef.current = renderedRef.current ?? toRef.current;
    }
    toRef.current = coord;
    fixTimeRef.current = now;
  }, [enabled, position, mapRef, headingRef]);

  // The animation loop. Keyed only on enabled/ready so it isn't torn down per fix.
  useEffect(() => {
    if (!enabled || !ready) return;

    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);

      const map = mapRef.current;
      const to = toRef.current;
      const from = fromRef.current;
      if (!map || !to || !from) return;

      const now = performance.now();
      // Let the intro fly-in finish before we take over with per-frame jumpTo.
      if (now < introEndRef.current) return;

      const t = easeOutCubic(clamp((now - fixTimeRef.current) / CATCH_UP_MS, 0, 1));
      const center = lerpLngLat(from, to, t);
      renderedRef.current = center;

      // Bearing: compass first, then GPS heading, then direction of travel.
      let target = headingRef.current ?? gpsHeadingRef.current;
      if (target === null) {
        const moved = calculateDistance(from, to) * 1000;
        target = moved > MIN_BEARING_MOVE_METERS ? bearingBetween(from, to) : bearingRef.current;
      }
      bearingRef.current = lerpAngle(bearingRef.current, target, BEARING_LERP);

      map.jumpTo({ center, bearing: bearingRef.current, pitch: NAV_PITCH, zoom: NAV_ZOOM });
      publish(center, bearingRef.current, now);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [enabled, ready, mapRef, headingRef, publish]);

  return { renderedPosition, renderedBearing };
}
