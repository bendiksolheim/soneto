import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/types/supabase";
import { Point } from "@/lib/map/point";
import { calculateRouteDistance } from "@/lib/types/route";

type RouteInsert = Database["public"]["Tables"]["routes"]["Insert"];
type RouteUpdate = Database["public"]["Tables"]["routes"]["Update"];

interface SupabaseRoute {
  id: string;
  user_id: string;
  name: string;
  points: Point[];
  distance: number;
  created_at: string;
  updated_at: string;
}

export class SupabaseRouteStorage {
  /**
   * Get all routes for the authenticated user
   */
  static async getRoutes(userId: string): Promise<SupabaseRoute[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading routes:", error);
      throw new Error("Failed to load routes from cloud storage");
    }

    // Parse points from JSONB to Point[]
    return (data || []).map((route) => ({
      ...route,
      points: route.points as unknown as Point[],
      distance: Number(route.distance),
    }));
  }

  /**
   * Get a single route by ID
   */
  static async getRoute(
    id: string,
    userId: string,
  ): Promise<SupabaseRoute | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      console.error("Error loading route:", error);
      throw new Error("Failed to load route from cloud storage");
    }

    return {
      ...data,
      points: data.points as unknown as Point[],
      distance: Number(data.distance),
    };
  }

  /**
   * Save a new route
   */
  static async saveRoute(
    routeData: { name: string; points: Point[] },
    userId: string,
  ): Promise<SupabaseRoute> {
    const supabase = createClient();
    const distance = calculateRouteDistance(routeData.points);

    const insertData: RouteInsert = {
      user_id: userId,
      name: routeData.name,
      points:
        routeData.points as unknown as Database["public"]["Tables"]["routes"]["Insert"]["points"], // JSONB type
      distance,
    };

    const { data, error } = await supabase
      .from("routes")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error saving route:", error);
      throw new Error("Failed to save route to cloud storage");
    }

    return {
      ...data,
      points: data.points as unknown as Point[],
      distance: Number(data.distance),
    };
  }

  /**
   * Update an existing route
   */
  static async updateRoute(
    id: string,
    updates: { name?: string; points?: Point[] },
    userId: string,
  ): Promise<SupabaseRoute | null> {
    const supabase = createClient();

    const updateData: RouteUpdate = {
      ...(updates.name && { name: updates.name }),
      ...(updates.points && {
        points:
          updates.points as unknown as Database["public"]["Tables"]["routes"]["Update"]["points"],
        distance: calculateRouteDistance(updates.points),
      }),
    };

    const { data, error } = await supabase
      .from("routes")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      console.error("Error updating route:", error);
      throw new Error("Failed to update route in cloud storage");
    }

    return {
      ...data,
      points: data.points as unknown as Point[],
      distance: Number(data.distance),
    };
  }

  /**
   * Delete a route
   */
  static async deleteRoute(id: string, userId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
      .from("routes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting route:", error);
      throw new Error("Failed to delete route from cloud storage");
    }

    return true;
  }

  /**
   * Clear all routes for a user
   */
  static async clearAllRoutes(userId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("routes")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error clearing routes:", error);
      throw new Error("Failed to clear routes from cloud storage");
    }
  }
}
