"use client";

import { useState, useEffect, useCallback } from "react";
import { StoredRoute, RouteWithCalculatedData } from "@/lib/types/route";
import { RouteStorageService } from "@/lib/services/route-storage";
import { Point } from "@/lib/map/point";

interface UseRoutesReturn {
  routes: RouteWithCalculatedData[];
  isLoading: boolean;
  error: string | null;
  saveRoute: (routeData: {
    name: string;
    points: Array<Point>;
  }) => Promise<StoredRoute>;
  updateRoute: (
    id: string,
    updates: { name?: string; points?: Array<Point> },
  ) => Promise<StoredRoute | null>;
  deleteRoute: (id: string) => Promise<boolean>;
  clearAllRoutes: () => Promise<void>;
  getRoute: (id: string) => RouteWithCalculatedData | null;
  refreshRoutes: () => void;
}

export function useRoutes(): UseRoutesReturn {
  const [routes, setRoutes] = useState<RouteWithCalculatedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load routes from storage
  const loadRoutes = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      const savedRoutes = RouteStorageService.getRoutesWithDistance();
      setRoutes(savedRoutes);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load routes";
      setError(errorMessage);
      console.error("Failed to load routes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load routes on mount
  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Save a new route
  const saveRoute = useCallback(
    async (routeData: { name: string; points: Array<Point> }) => {
      try {
        setError(null);
        const newRoute = RouteStorageService.saveRoute(routeData);

        // Add the new route with calculated distance to state
        const routeWithDistance: RouteWithCalculatedData = {
          ...newRoute,
          distance:
            RouteStorageService.getRouteWithDistance(newRoute.id)?.distance ||
            0,
        };

        setRoutes((prev) => [...prev, routeWithDistance]);
        return newRoute;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [],
  );

  // Update an existing route
  const updateRoute = useCallback(
    async (id: string, updates: { name?: string; points?: Array<Point> }) => {
      try {
        setError(null);
        const updatedRoute = RouteStorageService.updateRoute(id, updates);

        if (updatedRoute) {
          const routeWithDistance =
            RouteStorageService.getRouteWithDistance(id);
          if (routeWithDistance) {
            setRoutes((prev) =>
              prev.map((route) =>
                route.id === id ? routeWithDistance : route,
              ),
            );
          }
        }

        return updatedRoute;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [],
  );

  // Delete a route
  const deleteRoute = useCallback(async (id: string) => {
    try {
      setError(null);
      const success = RouteStorageService.deleteRoute(id);

      if (success) {
        setRoutes((prev) => prev.filter((route) => route.id !== id));
      }

      return success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete route";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Clear all routes
  const clearAllRoutes = useCallback(async () => {
    try {
      setError(null);
      RouteStorageService.clearAllRoutes();
      setRoutes([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear routes";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Get a single route by ID
  const getRoute = useCallback(
    (id: string): RouteWithCalculatedData | null => {
      return routes.find((route) => route.id === id) || null;
    },
    [routes],
  );

  // Refresh routes from storage
  const refreshRoutes = useCallback(() => {
    loadRoutes();
  }, [loadRoutes]);

  return {
    routes,
    isLoading,
    error,
    saveRoute,
    updateRoute,
    deleteRoute,
    clearAllRoutes,
    getRoute,
    refreshRoutes,
  };
}
