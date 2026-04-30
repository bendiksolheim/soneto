import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupLocalStorageMock } from "../../../test/mocks/localStorage";
import type { Point } from "../../map/point";
import RouteStorageService from "../route-storage";

describe("RouteStorageService", () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
  });

  describe("saveRoute", () => {
    it("creates new route with UUID and timestamp", () => {
      const routeData = {
        name: "Morning Run",
        points: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9149, longitude: 10.7532 },
        ] as Point[],
      };

      const savedRoute = RouteStorageService.saveRoute(routeData);

      expect(savedRoute.id).toBeTruthy();
      expect(savedRoute.name).toBe("Morning Run");
      expect(savedRoute.points).toEqual(routeData.points);
      expect(savedRoute.createdAt).toBeTruthy();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("persists route to localStorage", () => {
      const routeData = {
        name: "Test Route",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      };

      RouteStorageService.saveRoute(routeData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "route-runner-routes",
        expect.any(String),
      );
    });
  });

  describe("getRoutes", () => {
    it("returns empty array when no routes exist", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const routes = RouteStorageService.getRoutes();

      expect(routes).toEqual([]);
    });

    it("retrieves saved routes from localStorage", () => {
      const mockData = {
        routes: [
          {
            id: "123",
            name: "Test",
            points: [{ latitude: 60, longitude: 10 }],
            createdAt: "2025-10-05T00:00:00.000Z",
          },
        ],
        lastModified: "2025-10-05T00:00:00.000Z",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const routes = RouteStorageService.getRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0].name).toBe("Test");
    });

    it("handles corrupted localStorage data", () => {
      // Silence errors in terminal
      vi.spyOn(console, "error").mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue("invalid json{");

      const routes = RouteStorageService.getRoutes();

      expect(routes).toEqual([]);
    });
  });

  describe("updateRoute", () => {
    it("updates existing route name", () => {
      const initialRoute = RouteStorageService.saveRoute({
        name: "Old Name",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });

      const updated = RouteStorageService.updateRoute(initialRoute.id, {
        name: "New Name",
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("New Name");
      expect(updated?.id).toBe(initialRoute.id);
    });

    it("returns null for non-existent route", () => {
      const result = RouteStorageService.updateRoute("non-existent-id", {
        name: "Test",
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteRoute", () => {
    it("removes route from storage", () => {
      const route = RouteStorageService.saveRoute({
        name: "To Delete",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });

      const success = RouteStorageService.deleteRoute(route.id);

      expect(success).toBe(true);

      const routes = RouteStorageService.getRoutes();
      expect(routes.find((r) => r.id === route.id)).toBeUndefined();
    });

    it("returns false for non-existent route", () => {
      const success = RouteStorageService.deleteRoute("non-existent");

      expect(success).toBe(false);
    });
  });

  describe("getRouteSummaries", () => {
    it("returns id, name, and createdAt for each route", () => {
      const route = RouteStorageService.saveRoute({
        name: "Summary Route",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });

      const summaries = RouteStorageService.getRouteSummaries();

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toEqual({
        id: route.id,
        name: route.name,
        createdAt: route.createdAt,
      });
      expect(summaries[0]).not.toHaveProperty("points");
    });

    it("returns empty array when no routes exist", () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(RouteStorageService.getRouteSummaries()).toEqual([]);
    });
  });

  describe("getRoute", () => {
    it("returns route by id", () => {
      const saved = RouteStorageService.saveRoute({
        name: "Find Me",
        points: [{ latitude: 59, longitude: 10 }] as Point[],
      });

      const found = RouteStorageService.getRoute(saved.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe("Find Me");
    });

    it("returns null for unknown id", () => {
      expect(RouteStorageService.getRoute("no-such-id")).toBeNull();
    });
  });

  describe("getRouteWithDistance", () => {
    it("returns route with computed distance", () => {
      const saved = RouteStorageService.saveRoute({
        name: "Distance Route",
        points: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9249, longitude: 10.7632 },
        ] as Point[],
      });

      const result = RouteStorageService.getRouteWithDistance(saved.id);

      expect(result).not.toBeNull();
      expect(typeof result?.distance).toBe("number");
      expect(result?.distance).toBeGreaterThan(0);
    });

    it("returns null for unknown id", () => {
      expect(RouteStorageService.getRouteWithDistance("no-such-id")).toBeNull();
    });
  });

  describe("clearAllRoutes", () => {
    it("removes all routes from storage", () => {
      RouteStorageService.saveRoute({
        name: "Route A",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
      RouteStorageService.saveRoute({
        name: "Route B",
        points: [{ latitude: 61, longitude: 11 }] as Point[],
      });

      RouteStorageService.clearAllRoutes();

      expect(RouteStorageService.getRoutes()).toHaveLength(0);
    });
  });

  describe("getStorageInfo", () => {
    it("returns zero stats when storage is empty", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const info = RouteStorageService.getStorageInfo();

      expect(info.hasData).toBe(false);
      expect(info.routeCount).toBe(0);
      expect(info.sizeInBytes).toBe(0);
      expect(info.sizeInKB).toBe(0);
      expect(info.oldestRoute).toBeNull();
      expect(info.newestRoute).toBeNull();
    });

    it("reports correct route count and detects data presence", () => {
      RouteStorageService.saveRoute({
        name: "Info Route",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });

      const info = RouteStorageService.getStorageInfo();

      expect(info.hasData).toBe(true);
      expect(info.routeCount).toBe(1);
      expect(info.sizeInBytes).toBeGreaterThan(0);
    });

    it("returns oldest and newest route timestamps", () => {
      RouteStorageService.saveRoute({
        name: "First",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
      RouteStorageService.saveRoute({
        name: "Second",
        points: [{ latitude: 61, longitude: 11 }] as Point[],
      });

      const info = RouteStorageService.getStorageInfo();

      expect(info.oldestRoute).not.toBeNull();
      expect(info.newestRoute).not.toBeNull();
    });
  });

  describe("generic save error handling", () => {
    it("throws generic error for non-quota storage failures", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Unknown storage error");
      });

      expect(() =>
        RouteStorageService.saveRoute({
          name: "Error Route",
          points: [{ latitude: 60, longitude: 10 }] as Point[],
        }),
      ).toThrow("Failed to save routes to localStorage.");
    });
  });

  describe("QuotaExceededError handling", () => {
    it("throws error when storage quota exceeded", () => {
      // Silence errors in terminal
      vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new DOMException("Quota exceeded", "QuotaExceededError");
      localStorageMock.setItem.mockImplementation(() => {
        throw error;
      });

      const routeData = {
        name: "Large Route",
        points: Array(10000).fill({ latitude: 60, longitude: 10 }) as Point[],
      };

      expect(() => RouteStorageService.saveRoute(routeData)).toThrow("Storage quota exceeded");
    });
  });
});
