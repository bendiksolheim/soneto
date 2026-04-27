import { type ReactNode, useMemo } from "react";
import { Layer, type LineLayerSpecification, Source } from "react-map-gl/mapbox";
import { directionsToGeoJson } from "@/lib/map/directions-to-geojson";
import type { Directions } from "@/lib/mapbox";

type RouteProps = {
  directions: Array<Directions>;
};

export function Route(props: RouteProps): ReactNode {
  const routeGeoJson = useMemo(() => directionsToGeoJson(props.directions), [props.directions]);

  return (
    <Source type="geojson" data={routeGeoJson}>
      <Layer {...style} />
    </Source>
  );
}

const style: Omit<LineLayerSpecification, "source"> = {
  id: "route-layer",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#ef4444",
    "line-width": 4,
    "line-opacity": 0.8,
  },
};
