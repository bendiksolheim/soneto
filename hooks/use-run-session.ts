import { useEffect, useRef, useState } from "react";
import type { UserPosition } from "@/hooks/use-user-location";
import { calculateDistance } from "@/lib/elevation/elevation-data";

// Fixes less accurate than this (meters) are ignored — they tend to be GPS noise
// that would inflate the distance.
const MAX_ACCURACY_METERS = 25;
// Moves smaller than this (meters) are treated as standing still, so jitter while
// stationary doesn't accumulate distance.
const MIN_MOVE_METERS = 3;

type RunSession = {
  distanceKm: number;
  elapsedSeconds: number;
  // Pace in seconds per kilometer, or null until enough distance has been covered.
  paceSecondsPerKm: number | null;
};

type UseRunSessionArgs = {
  position: UserPosition | null;
  active: boolean;
};

// Derives live run metrics (distance travelled, elapsed time, pace) from the GPS
// position stream while run mode is active. Distance is the actual track walked,
// independent of any planned route.
export function useRunSession({ position, active }: UseRunSessionArgs): RunSession {
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // The last position we counted toward the total, as [lng, lat] for calculateDistance.
  const lastCoord = useRef<[number, number] | null>(null);
  // Timestamp of the last fix we processed, to ignore duplicate emissions.
  const lastTimestamp = useRef<number | null>(null);

  // Reset everything when a session starts; tick elapsed time once per second.
  useEffect(() => {
    if (!active) return;

    setDistanceKm(0);
    setElapsedSeconds(0);
    lastCoord.current = null;
    lastTimestamp.current = null;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [active]);

  // Accumulate distance from each accepted fix.
  useEffect(() => {
    if (!active || !position) return;
    if (position.timestamp === lastTimestamp.current) return;
    lastTimestamp.current = position.timestamp;

    if (position.accuracy > MAX_ACCURACY_METERS) return;

    const coord: [number, number] = [position.longitude, position.latitude];
    if (lastCoord.current === null) {
      lastCoord.current = coord;
      return;
    }

    const movedMeters = calculateDistance(lastCoord.current, coord) * 1000;
    if (movedMeters < MIN_MOVE_METERS) return;

    lastCoord.current = coord;
    setDistanceKm((prev) => prev + movedMeters / 1000);
  }, [active, position]);

  const paceSecondsPerKm = distanceKm > 0.05 ? elapsedSeconds / distanceKm : null;

  return { distanceKm, elapsedSeconds, paceSecondsPerKm };
}
