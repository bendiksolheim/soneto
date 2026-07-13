import type { ReactNode } from "react";
import { Layer, type LineLayerSpecification, Source } from "react-map-gl/mapbox";
import { directionsToGeoJson } from "@/lib/map/directions-to-geojson";
import { buildGradientStops } from "@/lib/map/route-gradient";
import type { Directions } from "@/lib/mapbox";

type ElevationSample = {
  distance: number;
  elevation: number;
  coordinate: [number, number];
};

type RouteProps = {
  directions: Array<Directions>;
  elevation: Array<ElevationSample>;
};

export function Route(props: RouteProps): ReactNode {
  const routeGeoJson = directionsToGeoJson(props.directions);
  const gradientStops = buildGradientStops(props.elevation);

  const useGradient = gradientStops.length >= 4;
  const lineStyle = useGradient ? buildGradientStyle(gradientStops) : flatStyle;

  return (
    <Source type="geojson" data={routeGeoJson} lineMetrics>
      <Layer {...casingStyle} />
      <Layer {...lineStyle} />
    </Source>
  );
}

const casingStyle: Omit<LineLayerSpecification, "source"> = {
  id: "route-casing",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#7a0000",
    "line-width": 7,
    "line-opacity": 0.9,
  },
};

const flatStyle: Omit<LineLayerSpecification, "source"> = {
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

function buildGradientStyle(stops: Array<number | string>): Omit<LineLayerSpecification, "source"> {
  return {
    id: "route-layer",
    type: "line",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-width": 4,
      "line-opacity": 0.95,
      "line-gradient": ["interpolate", ["linear"], ["line-progress"], ...stops] as never,
    },
  };
}
