import { describe, expect, it } from "vitest";
import type { Point } from "../map/point";
import { extractRouteFromUrl, generateShareUrl } from "../route-url";

const testPoints: Point[] = [
  { latitude: 59.9139, longitude: 10.7522 },
  { latitude: 59.9149, longitude: 10.7532 },
];

describe("generateShareUrl", () => {
  it("returns base URL for empty points", () => {
    const url = generateShareUrl([], "https://example.com");
    expect(url).toBe("https://example.com");
  });

  it("appends encoded route as query param", () => {
    const url = generateShareUrl(testPoints, "https://example.com");
    expect(url).toMatch(/^https:\/\/example\.com\?route=.+/);
  });

  it("uses provided baseUrl", () => {
    const url = generateShareUrl(testPoints, "https://myapp.com");
    expect(url.startsWith("https://myapp.com")).toBe(true);
  });

  it("falls back to window.location.origin when no baseUrl provided", () => {
    const url = generateShareUrl(testPoints);
    expect(typeof url).toBe("string");
    expect(url).toContain("?route=");
  });
});

describe("extractRouteFromUrl", () => {
  it("returns null when no route param", () => {
    expect(extractRouteFromUrl("?foo=bar")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractRouteFromUrl("")).toBeNull();
  });

  it("returns null for empty route param value", () => {
    expect(extractRouteFromUrl("?route=")).toBeNull();
  });

  it("decodes points from string search params", () => {
    const url = generateShareUrl(testPoints, "https://example.com");
    const search = url.replace("https://example.com", "");
    const points = extractRouteFromUrl(search);

    expect(points).not.toBeNull();
    expect(points).toHaveLength(testPoints.length);
    expect(points[0].latitude).toBeCloseTo(testPoints[0].latitude, 5);
    expect(points[0].longitude).toBeCloseTo(testPoints[0].longitude, 5);
  });

  it("accepts URLSearchParams as input", () => {
    const url = generateShareUrl(testPoints, "https://example.com");
    const params = new URLSearchParams(new URL(url).search);
    const points = extractRouteFromUrl(params);

    expect(points).not.toBeNull();
    expect(points).toHaveLength(testPoints.length);
  });

  it("round-trips through generateShareUrl", () => {
    const url = generateShareUrl(testPoints, "https://example.com");
    const decoded = extractRouteFromUrl(new URL(url).search);

    expect(decoded).toHaveLength(testPoints.length);
    decoded.forEach((point, i) => {
      expect(point.latitude).toBeCloseTo(testPoints[i].latitude, 5);
      expect(point.longitude).toBeCloseTo(testPoints[i].longitude, 5);
    });
  });
});
