import type { Point } from "@/lib/map/point";
import type { RouteWithCalculatedData } from "@/lib/types/route";

// Client for the /api/routes endpoints used when the user is signed in. Each call throws
// on HTTP errors so callers can surface a single error message. Kept outside the
// useRoutes hook so the React Compiler can optimize the hook (it can't yet compile a
// `throw` inside try/catch).
const cloudStorageService = {
  async getRoutes(): Promise<RouteWithCalculatedData[]> {
    const response = await fetch("/api/routes");
    if (!response.ok) throw new Error("Failed to load routes from cloud storage");
    return response.json();
  },

  async saveRoute(routeData: {
    name: string;
    points: Array<Point>;
  }): Promise<RouteWithCalculatedData> {
    const response = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(routeData),
    });
    if (!response.ok) throw new Error("Failed to save route to cloud storage");
    return response.json();
  },

  // Resolves to null when the route doesn't exist.
  async updateRoute(
    id: string,
    updates: { name?: string; points?: Array<Point> },
  ): Promise<RouteWithCalculatedData | null> {
    const response = await fetch(`/api/routes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to update route in cloud storage");
    return response.json();
  },

  // A route that's already gone counts as deleted.
  async deleteRoute(id: string): Promise<void> {
    const response = await fetch(`/api/routes/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to delete route from cloud storage");
    }
  },

  async clearAllRoutes(): Promise<void> {
    const response = await fetch("/api/routes", { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to clear routes from cloud storage");
  },
};

export default cloudStorageService;
