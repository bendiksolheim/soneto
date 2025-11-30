import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRoutes } from "./use-routes";
import { setupLocalStorageMock } from "../test/mocks/localStorage";
import { Point } from "@/lib/map/point";
import { AuthProvider } from "@/hooks/use-auth";

describe("useRoutes", () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
  });

  it("initializes with empty routes", async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={null}>{children}</AuthProvider>
      ),
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
      wrapper: ({ children }) => (
        <AuthProvider user={null}>{children}</AuthProvider>
      ),
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
      wrapper: ({ children }) => (
        <AuthProvider user={null}>{children}</AuthProvider>
      ),
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
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={null}>{children}</AuthProvider>
      ),
    });

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
    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={null}>{children}</AuthProvider>
      ),
    });

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

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={null}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // RouteStorageService catches errors and returns empty array
    expect(result.current.error).toBeNull();
    expect(result.current.routes).toEqual([]);
  });
});

describe("useRoutes - authenticated user (cloud storage)", () => {
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;
  const mockUser = {
    id: "test-user-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2025-01-01T00:00:00.000Z",
  } as any; // Type as any to avoid full User type construction

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
    vi.clearAllMocks();
  });

  it("initializes with empty routes from Supabase", async () => {
    // Mock Supabase getRoutes to return empty array
    const mockSupabase = (await import("@/lib/supabase/client")).createClient();
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toEqual([]);
    expect(result.current.isCloudStorage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("loads routes from Supabase on mount", async () => {
    const mockCloudRoutes = [
      {
        id: "cloud-123",
        user_id: mockUser.id,
        name: "Cloud Route",
        points: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9149, longitude: 10.7532 },
        ],
        distance: 150,
        created_at: "2025-10-05T00:00:00.000Z",
        updated_at: "2025-10-05T00:00:00.000Z",
      },
    ];

    const { createClient } = await import("@/lib/supabase/client");
    const mockFrom = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCloudRoutes, error: null }),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom as any,
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].name).toBe("Cloud Route");
    expect(result.current.routes[0].id).toBe("cloud-123");
    expect(result.current.isCloudStorage).toBe(true);
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });

  it("saves new route to Supabase", async () => {
    const newRouteData = {
      id: "new-cloud-123",
      user_id: mockUser.id,
      name: "New Cloud Route",
      points: [
        { latitude: 60, longitude: 10 },
        { latitude: 60.1, longitude: 10.1 },
      ],
      distance: 15700, // Calculated distance
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { createClient } = await import("@/lib/supabase/client");

    // Create mock function that will be updated for save operation
    let mockFrom: any = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update mock for save operation
    mockFrom = vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newRouteData, error: null }),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any);

    let savedRoute;
    await act(async () => {
      savedRoute = await result.current.saveRoute({
        name: "New Cloud Route",
        points: [
          { latitude: 60, longitude: 10 },
          { latitude: 60.1, longitude: 10.1 },
        ],
      });
    });

    expect(savedRoute).toBeTruthy();
    expect(savedRoute.name).toBe("New Cloud Route");
    expect(result.current.routes).toHaveLength(1);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("updates existing route in Supabase", async () => {
    const existingRoute = {
      id: "existing-123",
      user_id: mockUser.id,
      name: "Original Name",
      points: [{ latitude: 60, longitude: 10 }],
      distance: 0,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    };

    const { createClient } = await import("@/lib/supabase/client");

    // Create mock function that will be updated for update operation
    let mockFrom: any = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [existingRoute], error: null }),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock update operation
    const updatedRoute = { ...existingRoute, name: "Updated Name" };
    mockFrom = vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRoute, error: null }),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any);

    await act(async () => {
      await result.current.updateRoute("existing-123", { name: "Updated Name" });
    });

    await waitFor(() => {
      expect(result.current.routes[0].name).toBe("Updated Name");
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("deletes route from Supabase", async () => {
    const existingRoute = {
      id: "to-delete-123",
      user_id: mockUser.id,
      name: "To Delete",
      points: [{ latitude: 60, longitude: 10 }],
      distance: 0,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    };

    const { createClient } = await import("@/lib/supabase/client");

    // Create mock function that will be updated for delete operation
    let mockFrom: any = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [existingRoute], error: null }),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Need to mock the result of the second eq() call
    mockFrom = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    } as any);

    await act(async () => {
      await result.current.deleteRoute("to-delete-123");
    });

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(0);
    });
  });

  it("handles Supabase errors gracefully", async () => {
    // Silence console errors
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { createClient } = await import("@/lib/supabase/client");

    const mockFrom = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Supabase error" }
      }),
    }));

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom as any,
    } as any);

    const { result } = renderHook(() => useRoutes(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.routes).toEqual([]);
  });
});
