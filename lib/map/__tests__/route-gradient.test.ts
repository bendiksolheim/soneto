import { describe, expect, it } from "vitest";
import { buildGradientStops } from "../route-gradient";

type ElevationSample = {
  distance: number;
  elevation: number;
  coordinate: [number, number];
};

const DOWNHILL = "rgb(26, 152, 80)";
const UPHILL = "rgb(215, 48, 39)";

function sample(distance: number, elevation: number): ElevationSample {
  return { distance, elevation, coordinate: [0, 0] };
}

function progressOf(stops: Array<number | string>): Array<number> {
  return stops.filter((_, i) => i % 2 === 0) as Array<number>;
}

function colorsOf(stops: Array<number | string>): Array<string> {
  return stops.filter((_, i) => i % 2 === 1) as Array<string>;
}

describe("buildGradientStops", () => {
  it("returns empty array for no samples", () => {
    expect(buildGradientStops([])).toEqual([]);
  });

  it("returns empty array for a single sample", () => {
    expect(buildGradientStops([sample(0, 100)])).toEqual([]);
  });

  it("returns empty array when total distance is zero", () => {
    expect(buildGradientStops([sample(0, 100), sample(0, 110)])).toEqual([]);
  });

  it("produces 2 entries per sample (progress, color)", () => {
    const stops = buildGradientStops([sample(0, 100), sample(1, 100), sample(2, 100)]);
    expect(stops).toHaveLength(6);
  });

  it("starts at progress 0 and ends at progress 1", () => {
    const stops = buildGradientStops([sample(0, 100), sample(0.5, 100), sample(2, 100)]);
    const progress = progressOf(stops);
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
  });

  it("bumps duplicate progress values to keep stops monotonically increasing", () => {
    const stops = buildGradientStops([sample(0, 100), sample(0, 100), sample(2, 100)]);
    const progress = progressOf(stops);
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]).toBeGreaterThan(progress[i - 1]);
    }
  });

  it("colors a flat route as downhill green (slope is never positive)", () => {
    const stops = buildGradientStops([sample(0, 100), sample(1, 100), sample(2, 100)]);
    expect(colorsOf(stops).every((c) => c === DOWNHILL)).toBe(true);
  });

  it("colors a downhill route as downhill green", () => {
    const stops = buildGradientStops([sample(0, 200), sample(1, 100), sample(2, 0)]);
    expect(colorsOf(stops).every((c) => c === DOWNHILL)).toBe(true);
  });

  it("colors a steep (>=8%) uphill route as uphill red at the end", () => {
    // 10% slope: +100 m over 1 km
    const stops = buildGradientStops([sample(0, 0), sample(1, 100), sample(2, 200)]);
    const colors = colorsOf(stops);
    expect(colors[colors.length - 1]).toBe(UPHILL);
  });

  it("colors a mid-uphill route between the downhill and uphill endpoints", () => {
    // 4% slope: +40 m over 1 km — neither endpoint color
    const stops = buildGradientStops([sample(0, 0), sample(1, 40), sample(2, 80)]);
    const colors = colorsOf(stops);
    const last = colors[colors.length - 1];
    expect(last).not.toBe(DOWNHILL);
    expect(last).not.toBe(UPHILL);
    expect(last).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  it("colors the first stop the same as the rest on a uniform steep climb", () => {
    // Without the rawSlopes[0] = rawSlopes[1] fix, the first stop's color would
    // be dragged toward flat/downhill because its raw slope starts at 0.
    const stops = buildGradientStops([sample(0, 0), sample(1, 100), sample(2, 200)]);
    const colors = colorsOf(stops);
    expect(colors.every((c) => c === UPHILL)).toBe(true);
  });
});
