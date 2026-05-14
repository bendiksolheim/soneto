type ElevationSample = {
  distance: number;
  elevation: number;
  coordinate: [number, number];
};

const STEEP_SLOPE = 0.08;
const SMOOTHING_WINDOW = 5;

const DOWNHILL_COLOR: RGB = [26, 152, 80];
const FLAT_COLOR: RGB = [255, 255, 191];
const UPHILL_COLOR: RGB = [215, 48, 39];

type RGB = readonly [number, number, number];

export function buildGradientStops(elevation: Array<ElevationSample>): Array<number | string> {
  if (elevation.length < 2) {
    return [];
  }

  const slopes = computeSmoothedSlopes(elevation);
  const totalDistance = elevation[elevation.length - 1].distance;
  if (totalDistance <= 0) {
    return [];
  }

  const stops: Array<number | string> = [];
  let lastProgress = -1;

  for (let i = 0; i < elevation.length; i++) {
    let progress = elevation[i].distance / totalDistance;
    if (progress <= lastProgress) {
      progress = lastProgress + 1e-6;
    }
    if (progress > 1) {
      progress = 1;
    }
    stops.push(progress, slopeToColor(slopes[i]));
    lastProgress = progress;
  }

  return stops;
}

function computeSmoothedSlopes(elevation: Array<ElevationSample>): Array<number> {
  const rawSlopes = elevation.map((sample, i) => {
    if (i === 0) return 0;
    const prev = elevation[i - 1];
    const dDistance = (sample.distance - prev.distance) * 1000;
    if (dDistance <= 0) return 0;
    return (sample.elevation - prev.elevation) / dDistance;
  });
  if (rawSlopes.length > 1) {
    rawSlopes[0] = rawSlopes[1];
  }

  const half = Math.floor(SMOOTHING_WINDOW / 2);
  return rawSlopes.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(rawSlopes.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += rawSlopes[j];
    return sum / (end - start);
  });
}

function slopeToColor(slope: number): string {
  if (slope <= 0) {
    return rgbString(DOWNHILL_COLOR);
  }
  const t = Math.min(1, slope / STEEP_SLOPE);
  if (t <= 0.5) {
    return rgbString(mixRgb(DOWNHILL_COLOR, FLAT_COLOR, t / 0.5));
  }
  return rgbString(mixRgb(FLAT_COLOR, UPHILL_COLOR, (t - 0.5) / 0.5));
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgbString([r, g, b]: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}
