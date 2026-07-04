import { describe, expect, it } from "vitest";
import {
  bearingBetween,
  clamp,
  easeOutCubic,
  lerp,
  lerpAngle,
  lerpLngLat,
  normalizeBearing,
} from "../geo";

describe("lerp", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it("returns the midpoint at t=0.5", () => {
    expect(lerp(2, 6, 0.5)).toBe(4);
  });
});

describe("clamp", () => {
  it("clamps below the minimum", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  it("clamps above the maximum", () => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  it("passes through values in range", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe("easeOutCubic", () => {
  it("maps the endpoints to themselves", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("is ahead of linear in the first half (decelerating)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("lerpLngLat", () => {
  it("interpolates each component independently", () => {
    expect(lerpLngLat([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
  });
});

describe("normalizeBearing", () => {
  it("wraps negative bearings into [0, 360)", () => {
    expect(normalizeBearing(-90)).toBe(270);
  });

  it("wraps bearings >= 360", () => {
    expect(normalizeBearing(450)).toBe(90);
    expect(normalizeBearing(360)).toBe(0);
  });
});

describe("lerpAngle", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(lerpAngle(10, 80, 0)).toBe(10);
    expect(lerpAngle(10, 80, 1)).toBe(80);
  });

  it("takes the short way across the 0/360 seam", () => {
    // 350 -> 10 is +20 the short way, not -340.
    expect(lerpAngle(350, 10, 0.5)).toBe(0);
  });

  it("interpolates within a simple range", () => {
    expect(lerpAngle(0, 90, 0.5)).toBe(45);
  });
});

describe("bearingBetween", () => {
  it("points east when the target is due east", () => {
    expect(bearingBetween([0, 0], [1, 0])).toBeCloseTo(90, 1);
  });

  it("points north when the target is due north", () => {
    expect(bearingBetween([0, 0], [0, 1])).toBeCloseTo(0, 1);
  });

  it("points west when the target is due west", () => {
    expect(bearingBetween([0, 0], [-1, 0])).toBeCloseTo(270, 1);
  });
});
