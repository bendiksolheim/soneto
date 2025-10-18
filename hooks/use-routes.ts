"use client";

import { useState, useEffect, useCallback } from "react";
import { StoredRoute, RouteWithCalculatedData, calculateRouteDistance } from "@/lib/types/route";
import { RouteStorageService } from "@/lib/services/route-storage";
import { SupabaseRouteStorage } from "@/lib/services/supabase-route-storage";
import { Point } from "@/lib/map/point";
import { useAuth } from "@/hooks/use-auth";

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
  isCloudStorage: boolean; // NEW: Indicates storage type
}

export function useRoutes(): UseRoutesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [routes, setRoutes] = useState<RouteWithCalculatedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCloudStorage = !!user;

  // Load routes from appropriate storage
  const loadRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (user) {
        // Load from Supabase
        const cloudRoutes = await SupabaseRouteStorage.getRoutes(user.id);
        const routesWithDistance = cloudRoutes.map((route) => ({
          id: route.id,
          name: route.name,
          points: route.points,
          createdAt: route.created_at,
          distance: route.distance,
        }));
        setRoutes(routesWithDistance);
      } else {
        // Load from localStorage
        const localRoutes = RouteStorageService.getRoutesWithDistance();
        setRoutes(localRoutes);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load routes";
      setError(errorMessage);
      console.error("Failed to load routes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load routes when auth state changes
  useEffect(() => {
    if (!authLoading) {
      loadRoutes();
    }
  }, [authLoading, loadRoutes]);

  // Save a new route
  const saveRoute = useCallback(
    async (routeData: { name: string; points: Array<Point> }) => {
      try {
        setError(null);

        if (user) {
          // Save to Supabase
          const newRoute = await SupabaseRouteStorage.saveRoute(routeData, user.id);
          const routeWithDistance: RouteWithCalculatedData = {
            id: newRoute.id,
            name: newRoute.name,
            points: newRoute.points,
            createdAt: newRoute.created_at,
            distance: newRoute.distance,
          };
          setRoutes((prev) => [routeWithDistance, ...prev]);
          return {
            id: newRoute.id,
            name: newRoute.name,
            points: newRoute.points,
            createdAt: newRoute.created_at,
          };
        } else {
          // Save to localStorage
          const newRoute = RouteStorageService.saveRoute(routeData);
          const routeWithDistance: RouteWithCalculatedData = {
            ...newRoute,
            distance: calculateRouteDistance(newRoute.points),
          };
          setRoutes((prev) => [...prev, routeWithDistance]);
          return newRoute;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  // Update an existing route
  const updateRoute = useCallback(
    async (id: string, updates: { name?: string; points?: Array<Point> }) => {
      try {
        setError(null);

        if (user) {
          // Update in Supabase
          const updatedRoute = await SupabaseRouteStorage.updateRoute(id, updates, user.id);
          if (updatedRoute) {
            const routeWithDistance: RouteWithCalculatedData = {
              id: updatedRoute.id,
              name: updatedRoute.name,
              points: updatedRoute.points,
              createdAt: updatedRoute.created_at,
              distance: updatedRoute.distance,
            };
            setRoutes((prev) =>
              prev.map((route) => (route.id === id ? routeWithDistance : route)),
            );
            return {
              id: updatedRoute.id,
              name: updatedRoute.name,
              points: updatedRoute.points,
              createdAt: updatedRoute.created_at,
            };
          }
          return null;
        } else {
          // Update in localStorage
          const updatedRoute = RouteStorageService.updateRoute(id, updates);
          if (updatedRoute) {
            const routeWithDistance: RouteWithCalculatedData = {
              ...updatedRoute,
              distance: calculateRouteDistance(updatedRoute.points),
            };
            setRoutes((prev) =>
              prev.map((route) => (route.id === id ? routeWithDistance : route)),
            );
          }
          return updatedRoute;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  // Delete a route
  const deleteRoute = useCallback(
    async (id: string) => {
      try {
        setError(null);

        if (user) {
          // Delete from Supabase
          const success = await SupabaseRouteStorage.deleteRoute(id, user.id);
          if (success) {
            setRoutes((prev) => prev.filter((route) => route.id !== id));
          }
          return success;
        } else {
          // Delete from localStorage
          const success = RouteStorageService.deleteRoute(id);
          if (success) {
            setRoutes((prev) => prev.filter((route) => route.id !== id));
          }
          return success;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  // Clear all routes
  const clearAllRoutes = useCallback(async () => {
    try {
      setError(null);

      if (user) {
        // Clear from Supabase
        await SupabaseRouteStorage.clearAllRoutes(user.id);
      } else {
        // Clear from localStorage
        RouteStorageService.clearAllRoutes();
      }
      setRoutes([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear routes";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user]);

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
    isCloudStorage,
  };
}
