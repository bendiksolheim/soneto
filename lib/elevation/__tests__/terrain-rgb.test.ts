import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElevationLookup, fetchElevations } from "../terrain-rgb";

// R=1, G=138, B=136 → elevation = -10000 + (1*65536 + 138*256 + 136) * 0.1 = exactly 100m
const R = 1;
const G = 138;
const B = 136;
const pixelCount = 256 * 256;
const pixelData = new Uint8ClampedArray(pixelCount * 4);
for (let i = 0; i < pixelCount; i++) {
  pixelData[i * 4] = R;
  pixelData[i * 4 + 1] = G;
  pixelData[i * 4 + 2] = B;
  pixelData[i * 4 + 3] = 255;
}
const mockImageData = { data: pixelData } as ImageData;

const mockCtx = {
  drawImage: vi.fn(),
  getImageData: vi.fn().mockReturnValue(mockImageData),
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) }),
  );
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({}));
  class MockOffscreenCanvas {
    getContext() {
      return mockCtx;
    }
  }
  vi.stubGlobal("OffscreenCanvas", MockOffscreenCanvas);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("createElevationLookup", () => {
  it("returns elevation for known coordinates", () => {
    const map = new Map<string, number | null>([
      ["10.7522,59.9139", 120],
      ["10.7532,59.9149", 85],
    ]);
    const lookup = createElevationLookup(map);

    expect(lookup([10.7522, 59.9139])).toBe(120);
    expect(lookup([10.7532, 59.9149])).toBe(85);
  });

  it("returns null for unknown coordinates", () => {
    const lookup = createElevationLookup(new Map());
    expect(lookup([0, 0])).toBeNull();
  });

  it("returns null for explicitly null elevation", () => {
    const map = new Map<string, number | null>([["10,59", null]]);
    const lookup = createElevationLookup(map);
    expect(lookup([10, 59])).toBeNull();
  });
});

describe("fetchElevations", () => {
  it("returns an elevation for each coordinate", async () => {
    const coords: [number, number][] = [[10.7522, 59.9139]];

    const result = await fetchElevations(coords, "test-token", 14);

    expect(result.size).toBe(1);
    // 100m from the mocked pixel data
    expect(result.get("10.7522,59.9139")).toBeCloseTo(100, 0);
  });

  it("handles multiple coordinates", async () => {
    const coords: [number, number][] = [
      [10.7522, 59.9139],
      [10.7523, 59.914],
    ];

    const result = await fetchElevations(coords, "test-token", 14);

    expect(result.size).toBe(2);
  });

  it("stores null elevation when tile fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const coords: [number, number][] = [[5.0, 50.0]];
    // Use zoom=13 to avoid hitting the tile cache from other tests
    const result = await fetchElevations(coords, "bad-token", 13);

    expect(result.get("5,50")).toBeNull();
  });
});
