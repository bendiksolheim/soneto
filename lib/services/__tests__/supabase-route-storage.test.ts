import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import type { Point } from "@/lib/map/point";
import storageService from "../supabase-route-storage";

const USER_ID = "user-123";

const testPoints: Point[] = [
  { latitude: 59.9139, longitude: 10.7522 },
  { latitude: 59.9149, longitude: 10.7532 },
];

function buildRoute(overrides = {}) {
  return {
    id: "route-1",
    user_id: USER_ID,
    name: "Test Route",
    points: testPoints,
    distance: 150,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockFrom(chain: Record<string, unknown>) {
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  vi.mocked(createClient).mockReturnValue({ from: vi.fn(() => chain) } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRoutes", () => {
  it("returns routes from Supabase", async () => {
    const route = buildRoute();
    mockFrom({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [route], error: null }),
    });

    const result = await storageService.getRoutes(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Route");
    expect(result[0].distance).toBe(150);
  });

  it("returns empty array when no routes exist", async () => {
    mockFrom({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await storageService.getRoutes(USER_ID);
    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    });

    await expect(storageService.getRoutes(USER_ID)).rejects.toThrow(
      "Failed to load routes from cloud storage",
    );
  });
});

describe("getRoute", () => {
  it("returns a route by ID", async () => {
    const route = buildRoute();
    mockFrom({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: route, error: null }),
    });

    const result = await storageService.getRoute("route-1", USER_ID);
    expect(result?.id).toBe("route-1");
  });

  it("returns null when route is not found", async () => {
    mockFrom({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    });

    const result = await storageService.getRoute("missing", USER_ID);
    expect(result).toBeNull();
  });

  it("throws on unexpected Supabase error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "XXXXX", message: "error" } }),
    });

    await expect(storageService.getRoute("route-1", USER_ID)).rejects.toThrow(
      "Failed to load route from cloud storage",
    );
  });
});

describe("saveRoute", () => {
  it("inserts a route and returns it", async () => {
    const route = buildRoute();
    mockFrom({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: route, error: null }),
    });

    const result = await storageService.saveRoute({ name: "Test Route", points: testPoints }, USER_ID);

    expect(result.id).toBe("route-1");
    expect(result.name).toBe("Test Route");
  });

  it("throws on insert error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert error" } }),
    });

    await expect(
      storageService.saveRoute({ name: "Test Route", points: testPoints }, USER_ID),
    ).rejects.toThrow("Failed to save route to cloud storage");
  });
});

describe("updateRoute", () => {
  it("updates a route and returns the updated version", async () => {
    const updated = buildRoute({ name: "New Name" });
    mockFrom({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    });

    const result = await storageService.updateRoute("route-1", { name: "New Name" }, USER_ID);

    expect(result?.name).toBe("New Name");
  });

  it("returns null when route is not found", async () => {
    mockFrom({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    });

    const result = await storageService.updateRoute("missing", { name: "x" }, USER_ID);
    expect(result).toBeNull();
  });

  it("throws on unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "XXXXX" } }),
    });

    await expect(
      storageService.updateRoute("route-1", { name: "x" }, USER_ID),
    ).rejects.toThrow("Failed to update route in cloud storage");
  });
});

describe("deleteRoute", () => {
  it("deletes a route and returns true", async () => {
    mockFrom({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    });

    const result = await storageService.deleteRoute("route-1", USER_ID);
    expect(result).toBe(true);
  });

  it("throws on delete error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: "delete error" } }),
        })),
      })),
    });

    await expect(storageService.deleteRoute("route-1", USER_ID)).rejects.toThrow(
      "Failed to delete route from cloud storage",
    );
  });
});

describe("clearAllRoutes", () => {
  it("deletes all routes for a user without error", async () => {
    mockFrom({
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    });

    await expect(storageService.clearAllRoutes(USER_ID)).resolves.toBeUndefined();
  });

  it("throws when Supabase returns an error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom({
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: { message: "clear error" } }),
      })),
    });

    await expect(storageService.clearAllRoutes(USER_ID)).rejects.toThrow(
      "Failed to clear routes from cloud storage",
    );
  });
});
