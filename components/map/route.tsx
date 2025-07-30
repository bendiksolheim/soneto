import { directionsToGeoJson } from "@/lib/map/directions-to-geojson";
import { Directions } from "@/lib/mapbox";
import { ReactNode, useMemo } from "react";
import { Layer, LineLayerSpecification, Source } from "react-map-gl/mapbox";

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
  id: "data",
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
