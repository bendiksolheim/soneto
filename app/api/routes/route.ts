import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbRouteStorage from "@/lib/services/db-route-storage";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const routes = await dbRouteStorage.getRoutes(session.user.id);
  return NextResponse.json(routes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const route = await dbRouteStorage.saveRoute(body, session.user.id);
  return NextResponse.json(route, { status: 201 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbRouteStorage.clearAllRoutes(session.user.id);
  return new NextResponse(null, { status: 204 });
}
