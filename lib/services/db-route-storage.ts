import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { routes } from "@/lib/db/schema";
import type { Point } from "@/lib/map/point";
import { calculateRouteDistance } from "@/lib/types/route";

interface DbRoute {
  id: string;
  userId: string;
  name: string;
  points: Point[];
  distance: number;
  createdAt: string;
  updatedAt: string;
}

function parsePoints(raw: string): Point[] {
  return JSON.parse(raw) as Point[];
}

function rowToRoute(row: typeof routes.$inferSelect): DbRoute {
  return {
    ...row,
    points: parsePoints(row.points),
  };
}

const storageService = {
  async getRoutes(userId: string): Promise<DbRoute[]> {
    const rows = getDb()
      .select()
      .from(routes)
      .where(eq(routes.userId, userId))
      .orderBy(desc(routes.createdAt))
      .all();
    return rows.map(rowToRoute);
  },

  async getRoute(id: string, userId: string): Promise<DbRoute | null> {
    const row = getDb()
      .select()
      .from(routes)
      .where(eq(routes.id, id))
      .get();
    if (!row || row.userId !== userId) return null;
    return rowToRoute(row);
  },

  async saveRoute(
    routeData: { name: string; points: Point[] },
    userId: string,
  ): Promise<DbRoute> {
    const distance = calculateRouteDistance(routeData.points);
    const row = getDb()
      .insert(routes)
      .values({
        userId,
        name: routeData.name,
        points: JSON.stringify(routeData.points),
        distance,
      })
      .returning()
      .get();
    return rowToRoute(row);
  },

  async updateRoute(
    id: string,
    updates: { name?: string; points?: Point[] },
    userId: string,
  ): Promise<DbRoute | null> {
    const existing = await storageService.getRoute(id, userId);
    if (!existing) return null;

    const row = getDb()
      .update(routes)
      .set({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.points !== undefined && {
          points: JSON.stringify(updates.points),
          distance: calculateRouteDistance(updates.points),
        }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(routes.id, id))
      .returning()
      .get();
    return rowToRoute(row);
  },

  async deleteRoute(id: string, userId: string): Promise<boolean> {
    const existing = await storageService.getRoute(id, userId);
    if (!existing) return false;
    getDb().delete(routes).where(eq(routes.id, id)).run();
    return true;
  },

  async clearAllRoutes(userId: string): Promise<void> {
    getDb().delete(routes).where(eq(routes.userId, userId)).run();
  },
};

export default storageService;
