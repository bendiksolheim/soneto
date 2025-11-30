import { extractRouteFromUrl } from "@/lib/route-url";
import RoutePlannerPage from "@/components/route-planner-page";
import { Point } from "@/lib/map/point";

type HomePageProps = {
  searchParams: Promise<{ route?: string }>;
};

export default async function HomePage(props: HomePageProps) {
  const searchParams = await props.searchParams;
  const route = searchParams.route;
  const initialRoute = getRouteFromUrlParam(route);
  return <RoutePlannerPage initialRoute={initialRoute} />;
}

function getRouteFromUrlParam(route?: string): Point[] | null {
  if (!route) return null;

  try {
    const params = new URLSearchParams({ route });
    return extractRouteFromUrl(params);
  } catch (error) {
    console.error("[Server] Failed to extract route from URL:", error);
    return null;
  }
}
