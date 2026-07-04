// Pure geometry helpers for smoothly interpolating the run-mode follow camera and
// marker between the ~1Hz GPS fixes. Kept free of React so they can be unit tested.

// Linear interpolation between two numbers.
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp a number into the inclusive [min, max] range.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Ease-out cubic: fast at first, decelerating toward the target. Used so the camera
// settles gently onto each new fix instead of arriving at constant speed.
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

// Interpolate between two [lng, lat] coordinates. Linear interpolation is accurate
// enough over the few metres between consecutive fixes.
export function lerpLngLat(
  from: [number, number],
  to: [number, number],
  t: number,
): [number, number] {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)];
}

// Wrap a bearing into the [0, 360) range.
export function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Interpolate between two bearings along the shortest angular path, so a turn from
// 350° to 10° sweeps 20° forward rather than 340° backward.
export function lerpAngle(from: number, to: number, t: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return normalizeBearing(from + diff * t);
}

// Initial compass bearing (degrees clockwise from true north) from one [lng, lat]
// coordinate to another. Used as a heading fallback when no compass/GPS heading is
// available, derived from the direction of travel between two fixes.
export function bearingBetween(from: [number, number], to: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLng = toRad(to[0] - from[0]);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return normalizeBearing((Math.atan2(y, x) * 180) / Math.PI);
}
