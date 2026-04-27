import {
  calculateRouteDistance,
  ROUTES_STORAGE_KEY,
  type RouteStorage,
  type RouteWithCalculatedData,
  type StoredRoute,
} from "@/lib/types/route";
import type { Point } from "../map/point";

// Private method to save routes array to localStorage
function saveRoutes(routes: StoredRoute[]): void {
  try {
    const storage: RouteStorage = {
      routes,
      lastModified: new Date().toISOString(),
    };

    localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error("Error saving routes:", error);

    // Check if storage is full
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded. Please delete some routes to free up space.");
    }

    throw new Error("Failed to save routes to localStorage.");
  }
}

const storageService = {
  // Get all routes from localStorage
  getRoutes(): StoredRoute[] {
    try {
      const data = localStorage.getItem(ROUTES_STORAGE_KEY);
      if (!data) return [];

      const storage: RouteStorage = JSON.parse(data);
      return storage.routes || [];
    } catch (error) {
      console.error("Error loading routes:", error);
      return [];
    }
  },

  // Get all routes with calculated distance
  getRoutesWithDistance(): RouteWithCalculatedData[] {
    return storageService.getRoutes().map((route) => ({
      ...route,
      distance: calculateRouteDistance(route.points),
    }));
  },

  // Get route summaries (id, name, createdAt) for listing - lighter data transfer
  getRouteSummaries(): Pick<StoredRoute, "id" | "name" | "createdAt">[] {
    return storageService.getRoutes().map((route) => ({
      id: route.id,
      name: route.name,
      createdAt: route.createdAt,
    }));
  },

  // Get single route by ID
  getRoute(id: string): StoredRoute | null {
    const routes = storageService.getRoutes();
    return routes.find((route) => route.id === id) || null;
  },

  // Get single route with calculated distance
  getRouteWithDistance(id: string): RouteWithCalculatedData | null {
    const route = storageService.getRoute(id);
    if (!route) return null;

    return {
      ...route,
      distance: calculateRouteDistance(route.points),
    };
  },

  // Save a new route
  saveRoute(routeData: { name: string; points: Array<Point> }): StoredRoute {
    const newRoute: StoredRoute = {
      id: crypto.randomUUID(),
      name: routeData.name,
      points: routeData.points,
      createdAt: new Date().toISOString(),
    };

    const routes = storageService.getRoutes();
    routes.push(newRoute);
    saveRoutes(routes);

    return newRoute;
  },

  // Update existing route (only name and points can be updated)
  updateRoute(
    id: string,
    updates: Partial<Pick<StoredRoute, "name" | "points">>,
  ): StoredRoute | null {
    const routes = storageService.getRoutes();
    const index = routes.findIndex((r) => r.id === id);

    if (index === -1) return null;

    // Only allow updating name and points, preserve id and createdAt
    const updatedRoute: StoredRoute = {
      ...routes[index],
      ...(updates.name && { name: updates.name }),
      ...(updates.points && { points: updates.points }),
    };

    routes[index] = updatedRoute;
    saveRoutes(routes);

    return updatedRoute;
  },

  // Delete route by ID
  deleteRoute(id: string): boolean {
    const routes = storageService.getRoutes();
    const filteredRoutes = routes.filter((r) => r.id !== id);

    if (filteredRoutes.length === routes.length) return false;

    saveRoutes(filteredRoutes);
    return true;
  },

  // Clear all routes
  clearAllRoutes(): void {
    saveRoutes([]);
  },

  // Get storage statistics (useful for debugging)
  getStorageInfo() {
    const data = localStorage.getItem(ROUTES_STORAGE_KEY);
    const routes = storageService.getRoutes();

    return {
      hasData: !!data,
      sizeInBytes: data ? new Blob([data]).size : 0,
      sizeInKB: data ? Math.round(new Blob([data]).size / 1024) : 0,
      routeCount: routes.length,
      totalPoints: routes.reduce((sum, route) => sum + route.points.length, 0),
      oldestRoute:
        routes.length > 0
          ? routes.reduce((oldest, route) => (route.createdAt < oldest.createdAt ? route : oldest))
              .createdAt
          : null,
      newestRoute:
        routes.length > 0
          ? routes.reduce((newest, route) => (route.createdAt > newest.createdAt ? route : newest))
              .createdAt
          : null,
    };
  },
};

export default storageService;
