import { describe, expect, it } from "vitest";
import type { Point } from "../../map/point";
import { bearingTo, destinationPoint, haversineDistanceMeters } from "../geo";

const oslo: Point = { latitude: 59.9139, longitude: 10.7522 };

describe("destinationPoint", () => {
  it("moves north for bearing 0", () => {
    const result = destinationPoint(oslo, 0, 1000);
    expect(result.latitude).toBeGreaterThan(oslo.latitude);
    expect(result.longitude).toBeCloseTo(oslo.longitude, 4);
  });

  it("moves east for bearing 90", () => {
    const result = destinationPoint(oslo, 90, 1000);
    expect(result.longitude).toBeGreaterThan(oslo.longitude);
    expect(result.latitude).toBeCloseTo(oslo.latitude, 3);
  });

  it("moves south for bearing 180", () => {
    const result = destinationPoint(oslo, 180, 1000);
    expect(result.latitude).toBeLessThan(oslo.latitude);
    expect(result.longitude).toBeCloseTo(oslo.longitude, 4);
  });

  it("moves west for bearing 270", () => {
    const result = destinationPoint(oslo, 270, 1000);
    expect(result.longitude).toBeLessThan(oslo.longitude);
    expect(result.latitude).toBeCloseTo(oslo.latitude, 3);
  });

  it("approximately preserves the requested distance", () => {
    const result = destinationPoint(oslo, 45, 5000);
    const actual = haversineDistanceMeters(oslo, result);
    expect(actual).toBeCloseTo(5000, -1);
  });
});

describe("bearingTo", () => {
  it("returns ~0 for due north", () => {
    const north = destinationPoint(oslo, 0, 1000);
    expect(bearingTo(oslo, north)).toBeCloseTo(0, 1);
  });

  it("returns ~90 for due east", () => {
    const east = destinationPoint(oslo, 90, 1000);
    expect(bearingTo(oslo, east)).toBeCloseTo(90, 1);
  });

  it("returns ~180 for due south", () => {
    const south = destinationPoint(oslo, 180, 1000);
    expect(bearingTo(oslo, south)).toBeCloseTo(180, 1);
  });

  it("returns ~270 for due west", () => {
    const west = destinationPoint(oslo, 270, 1000);
    expect(bearingTo(oslo, west)).toBeCloseTo(270, 1);
  });

  it("is the inverse of destinationPoint across the cardinals", () => {
    for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const point = destinationPoint(oslo, bearing, 2000);
      expect(bearingTo(oslo, point)).toBeCloseTo(bearing, 1);
    }
  });
});

describe("haversineDistanceMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineDistanceMeters(oslo, oslo)).toBeCloseTo(0, 6);
  });

  it("is symmetric", () => {
    const other: Point = { latitude: 60.0, longitude: 11.0 };
    expect(haversineDistanceMeters(oslo, other)).toBeCloseTo(
      haversineDistanceMeters(other, oslo),
      6,
    );
  });
});
