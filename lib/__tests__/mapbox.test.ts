import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Point } from "../map/point";
import { directions } from "../mapbox";

const twoPoints: Point[] = [
  { latitude: 59.9139, longitude: 10.7522 },
  { latitude: 59.9149, longitude: 10.7532 },
];

const mockResponse = { routes: [], uuid: "test", waypoints: [] };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve(mockResponse) }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("directions", () => {
  it("calls the Mapbox walking directions API", async () => {
    await directions(twoPoints, "test-token");

    expect(fetch).toHaveBeenCalledOnce();
    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("mapbox/walking");
  });

  it("encodes coordinates as lng,lat separated by semicolons", async () => {
    await directions(twoPoints, "test-token");

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("10.7522,59.9139;10.7532,59.9149");
  });

  it("includes the access token", async () => {
    await directions(twoPoints, "my-token");

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("access_token=my-token");
  });

  it("requests full overview with geojson geometry", async () => {
    await directions(twoPoints, "token");

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("overview=full");
    expect(url).toContain("geometries=geojson");
  });

  it("excludes ferry routes", async () => {
    await directions(twoPoints, "token");

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("exclude=ferry");
  });

  it("returns the parsed JSON response", async () => {
    const data = { routes: [{ distance: 150 }], uuid: "abc", waypoints: [] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve(data) }));

    const result = await directions(twoPoints, "token");
    expect(result).toEqual(data);
  });

  it("rejects when fetch throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    await expect(directions(twoPoints, "token")).rejects.toThrow("network error");
  });
});
