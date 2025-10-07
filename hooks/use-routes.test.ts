import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRoutes } from "./use-routes";
import { setupLocalStorageMock } from "../test/mocks/localStorage";
import { Point } from "@/lib/map/point";

describe("useRoutes", () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
  });

  it("initializes with empty routes", async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useRoutes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("loads routes from localStorage on mount", async () => {
    const mockData = {
      routes: [
        {
          id: "123",
          name: "Test Route",
          points: [
            { latitude: 59.9139, longitude: 10.7522 },
            { latitude: 59.9149, longitude: 10.7532 },
          ],
          createdAt: "2025-10-05T00:00:00.000Z",
        },
      ],
      lastModified: "2025-10-05T00:00:00.000Z",
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

    const { result } = renderHook(() => useRoutes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].name).toBe("Test Route");
    expect(result.current.routes[0].distance).toBeGreaterThan(0);
  });

  it("saves new route and updates state", async () => {
    const { result } = renderHook(() => useRoutes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const routeData = {
      name: "New Route",
      points: [
        { latitude: 60, longitude: 10 },
        { latitude: 60.1, longitude: 10.1 },
      ] as Point[],
    };

    let savedRoute;
    await act(async () => {
      savedRoute = await result.current.saveRoute(routeData);
    });

    expect(savedRoute).toBeTruthy();

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(1);
    });

    expect(result.current.routes[0].name).toBe("New Route");
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("updates existing route", async () => {
    const { result } = renderHook(() => useRoutes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let saved;
    await act(async () => {
      saved = await result.current.saveRoute({
        name: "Original",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(1);
    });

    await act(async () => {
      await result.current.updateRoute(saved.id, { name: "Updated" });
    });

    await waitFor(() => {
      expect(result.current.routes[0].name).toBe("Updated");
    });
  });

  it("deletes route and updates state", async () => {
    const { result } = renderHook(() => useRoutes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let saved;
    await act(async () => {
      saved = await result.current.saveRoute({
        name: "To Delete",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(1);
    });

    await act(async () => {
      await result.current.deleteRoute(saved.id);
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(0);
    });
  });

  it("handles localStorage errors gracefully", async () => {
    // Silence warnings
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });

    const { result } = renderHook(() => useRoutes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // RouteStorageService catches errors and returns empty array
    expect(result.current.error).toBeNull();
    expect(result.current.routes).toEqual([]);
  });
});
