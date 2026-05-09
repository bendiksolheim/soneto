import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, type AuthUser } from "@/hooks/use-auth";
import type { Point } from "@/lib/map/point";
import RouteStorageService from "@/lib/services/route-storage";
import type { StoredRoute } from "@/lib/types/route";
import { setupLocalStorageMock } from "../../test/mocks/localStorage";
import { useRoutes } from "../use-routes";

function mockFetch(body: unknown, status = 200) {
  return vi
    .spyOn(global, "fetch")
    .mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }));
}

describe("useRoutes", () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorageMock = setupLocalStorageMock();
  });

  it("initializes with empty routes", async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

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

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].name).toBe("Test Route");
    expect(result.current.routes[0].distance).toBeGreaterThan(0);
  });

  it("saves new route and updates state", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

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

    let savedRoute: StoredRoute;
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
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let saved: StoredRoute;
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
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let saved: StoredRoute;
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
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.routes).toEqual([]);
  });

  it("clears all routes", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.saveRoute({
        name: "Route to clear",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(1);
    });

    await act(async () => {
      await result.current.clearAllRoutes();
    });

    expect(result.current.routes).toHaveLength(0);
  });

  it("handles clearAllRoutes errors", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.spyOn(RouteStorageService, "clearAllRoutes").mockImplementation(() => {
      throw new Error("Storage error");
    });

    let thrownError: Error | null = null;
    await act(async () => {
      try {
        await result.current.clearAllRoutes();
      } catch (e) {
        thrownError = e as Error;
      }
    });

    expect(thrownError?.message).toBe("Storage error");
    expect(result.current.error).toBe("Storage error");
  });

  it("returns a route by ID", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let saved: StoredRoute;
    await act(async () => {
      saved = await result.current.saveRoute({
        name: "Findable",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(1);
    });

    const found = result.current.getRoute(saved.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Findable");
  });

  it("returns null for unknown route ID", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getRoute("nonexistent")).toBeNull();
  });

  it("refreshRoutes reloads routes from storage", async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toHaveLength(0);

    const mockData = {
      routes: [
        {
          id: "refreshed-id",
          name: "Refreshed Route",
          points: [{ latitude: 60, longitude: 10 }],
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      lastModified: "2025-01-01T00:00:00.000Z",
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

    await act(async () => {
      result.current.refreshRoutes();
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(1);
    });

    expect(result.current.routes[0].name).toBe("Refreshed Route");
  });

  it("handles saveRoute errors", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.spyOn(RouteStorageService, "saveRoute").mockImplementation(() => {
      throw new Error("Storage full");
    });

    let thrownError: Error | null = null;
    await act(async () => {
      try {
        await result.current.saveRoute({
          name: "Failing Route",
          points: [{ latitude: 60, longitude: 10 }] as Point[],
        });
      } catch (e) {
        thrownError = e as Error;
      }
    });

    expect(thrownError?.message).toBe("Storage full");
    expect(result.current.error).toBe("Storage full");
  });

  it("handles updateRoute errors", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let saved: StoredRoute;
    await act(async () => {
      saved = await result.current.saveRoute({
        name: "Route",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
    });

    vi.spyOn(RouteStorageService, "updateRoute").mockImplementation(() => {
      throw new Error("Update failed");
    });

    let thrownError: Error | null = null;
    await act(async () => {
      try {
        await result.current.updateRoute(saved.id, { name: "New Name" });
      } catch (e) {
        thrownError = e as Error;
      }
    });

    expect(thrownError?.message).toBe("Update failed");
    expect(result.current.error).toBe("Update failed");
  });

  it("handles deleteRoute errors", async () => {
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let saved: StoredRoute;
    await act(async () => {
      saved = await result.current.saveRoute({
        name: "Route",
        points: [{ latitude: 60, longitude: 10 }] as Point[],
      });
    });

    vi.spyOn(RouteStorageService, "deleteRoute").mockImplementation(() => {
      throw new Error("Delete failed");
    });

    let thrownError: Error | null = null;
    await act(async () => {
      try {
        await result.current.deleteRoute(saved.id);
      } catch (e) {
        thrownError = e as Error;
      }
    });

    expect(thrownError?.message).toBe("Delete failed");
    expect(result.current.error).toBe("Delete failed");
  });
});

describe("useRoutes - authenticated user (cloud storage)", () => {
  const mockUser: AuthUser = {
    id: "github-123456",
    name: "Test User",
    email: "test@example.com",
    image: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads routes from API on mount", async () => {
    const mockRoutes = [
      {
        id: "db-123",
        userId: mockUser.id,
        name: "DB Route",
        points: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9149, longitude: 10.7532 },
        ],
        distance: 150,
        createdAt: "2025-10-05T00:00:00.000Z",
      },
    ];
    mockFetch(mockRoutes);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].name).toBe("DB Route");
    expect(result.current.isCloudStorage).toBe(true);
  });

  it("saves new route via API", async () => {
    const savedRoute = {
      id: "new-db-123",
      userId: mockUser.id,
      name: "New DB Route",
      points: [
        { latitude: 60, longitude: 10 },
        { latitude: 60.1, longitude: 10.1 },
      ],
      distance: 15700,
      createdAt: new Date().toISOString(),
    };
    mockFetch([]);
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(savedRoute), { status: 201 }));

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let returned: StoredRoute;
    await act(async () => {
      returned = await result.current.saveRoute({
        name: "New DB Route",
        points: [
          { latitude: 60, longitude: 10 },
          { latitude: 60.1, longitude: 10.1 },
        ],
      });
    });

    expect(returned.name).toBe("New DB Route");
    expect(result.current.routes).toHaveLength(1);
  });

  it("updates existing route via API", async () => {
    const existingRoute = {
      id: "existing-123",
      userId: mockUser.id,
      name: "Original Name",
      points: [{ latitude: 60, longitude: 10 }],
      distance: 0,
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([existingRoute]), { status: 200 }));
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...existingRoute, name: "Updated Name" }), { status: 200 }),
    );

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateRoute("existing-123", { name: "Updated Name" });
    });

    await waitFor(() => {
      expect(result.current.routes[0].name).toBe("Updated Name");
    });
  });

  it("deletes route via API", async () => {
    const existingRoute = {
      id: "to-delete-123",
      userId: mockUser.id,
      name: "To Delete",
      points: [{ latitude: 60, longitude: 10 }],
      distance: 0,
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([existingRoute]), { status: 200 }));
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteRoute("to-delete-123");
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(0);
    });
  });

  it("handles API errors gracefully", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ error: "Server error" }, 500);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.routes).toEqual([]);
  });

  it("clears all routes via API", async () => {
    const existingRoute = {
      id: "cloud-to-clear",
      userId: mockUser.id,
      name: "To Clear",
      points: [{ latitude: 60, longitude: 10 }],
      distance: 0,
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([existingRoute]), { status: 200 }));
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toHaveLength(1);

    await act(async () => {
      await result.current.clearAllRoutes();
    });

    expect(result.current.routes).toHaveLength(0);
  });

  it("updateRoute returns null when route not found", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
    );

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let updateResult: StoredRoute | null | undefined;
    await act(async () => {
      updateResult = await result.current.updateRoute("nonexistent-id", { name: "New Name" });
    });

    expect(updateResult).toBeNull();
  });
});
