"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Point } from "@/lib/map/point";
import RouteStorageService from "@/lib/services/route-storage";
import {
  calculateRouteDistance,
  type RouteWithCalculatedData,
  type StoredRoute,
} from "@/lib/types/route";

interface UseRoutesReturn {
  routes: RouteWithCalculatedData[];
  isLoading: boolean;
  error: string | null;
  saveRoute: (routeData: { name: string; points: Array<Point> }) => Promise<StoredRoute>;
  updateRoute: (
    id: string,
    updates: { name?: string; points?: Array<Point> },
  ) => Promise<StoredRoute | null>;
  deleteRoute: (id: string) => Promise<boolean>;
  clearAllRoutes: () => Promise<void>;
  getRoute: (id: string) => RouteWithCalculatedData | null;
  refreshRoutes: () => void;
  isCloudStorage: boolean;
}

export function useRoutes(): UseRoutesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [routes, setRoutes] = useState<RouteWithCalculatedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCloudStorage = !!user;

  const loadRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (user) {
        const response = await fetch("/api/routes");
        if (!response.ok) throw new Error("Failed to load routes from cloud storage");
        const cloudRoutes: RouteWithCalculatedData[] = await response.json();
        setRoutes(cloudRoutes);
      } else {
        const localRoutes = RouteStorageService.getRoutesWithDistance();
        setRoutes(localRoutes);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load routes";
      setError(errorMessage);
      console.error("Failed to load routes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadRoutes();
    }
  }, [authLoading, loadRoutes]);

  const saveRoute = useCallback(
    async (routeData: { name: string; points: Array<Point> }) => {
      try {
        setError(null);

        if (user) {
          const response = await fetch("/api/routes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(routeData),
          });
          if (!response.ok) throw new Error("Failed to save route to cloud storage");
          const newRoute: RouteWithCalculatedData = await response.json();
          setRoutes((prev) => [newRoute, ...prev]);
          return { id: newRoute.id, name: newRoute.name, points: newRoute.points, createdAt: newRoute.createdAt };
        } else {
          const newRoute = RouteStorageService.saveRoute(routeData);
          const routeWithDistance: RouteWithCalculatedData = {
            ...newRoute,
            distance: calculateRouteDistance(newRoute.points),
          };
          setRoutes((prev) => [...prev, routeWithDistance]);
          return newRoute;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  const updateRoute = useCallback(
    async (id: string, updates: { name?: string; points?: Array<Point> }) => {
      try {
        setError(null);

        if (user) {
          const response = await fetch(`/api/routes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (response.status === 404) return null;
          if (!response.ok) throw new Error("Failed to update route in cloud storage");
          const updatedRoute: RouteWithCalculatedData = await response.json();
          setRoutes((prev) => prev.map((route) => (route.id === id ? updatedRoute : route)));
          return { id: updatedRoute.id, name: updatedRoute.name, points: updatedRoute.points, createdAt: updatedRoute.createdAt };
        } else {
          const updatedRoute = RouteStorageService.updateRoute(id, updates);
          if (updatedRoute) {
            const routeWithDistance: RouteWithCalculatedData = {
              ...updatedRoute,
              distance: calculateRouteDistance(updatedRoute.points),
            };
            setRoutes((prev) => prev.map((route) => (route.id === id ? routeWithDistance : route)));
          }
          return updatedRoute;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  const deleteRoute = useCallback(
    async (id: string) => {
      try {
        setError(null);

        if (user) {
          const response = await fetch(`/api/routes/${id}`, { method: "DELETE" });
          if (!response.ok && response.status !== 404) throw new Error("Failed to delete route from cloud storage");
          setRoutes((prev) => prev.filter((route) => route.id !== id));
          return true;
        } else {
          const success = RouteStorageService.deleteRoute(id);
          if (success) {
            setRoutes((prev) => prev.filter((route) => route.id !== id));
          }
          return success;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  const clearAllRoutes = useCallback(async () => {
    try {
      setError(null);

      if (user) {
        const response = await fetch("/api/routes", { method: "DELETE" });
        if (!response.ok) throw new Error("Failed to clear routes from cloud storage");
      } else {
        RouteStorageService.clearAllRoutes();
      }
      setRoutes([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to clear routes";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user]);

  const getRoute = useCallback(
    (id: string): RouteWithCalculatedData | null => {
      return routes.find((route) => route.id === id) || null;
    },
    [routes],
  );

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
