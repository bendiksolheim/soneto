import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbRouteStorage from "@/lib/services/db-route-storage";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const route = await dbRouteStorage.updateRoute(id, body, session.user.id);
  if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(route);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const success = await dbRouteStorage.deleteRoute(id, session.user.id);
  if (!success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
