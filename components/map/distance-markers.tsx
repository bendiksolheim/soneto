import { type ReactNode, useMemo } from "react";
import {
  type CircleLayerSpecification,
  Layer,
  Source,
  type SymbolLayerSpecification,
} from "react-map-gl/mapbox";
import { buildMarkers } from "@/lib/map/distance-markers";
import type { Directions } from "@/lib/mapbox";

type DistanceMarkersProps = {
  directions: Array<Directions>;
};

export function DistanceMarkers(props: DistanceMarkersProps): ReactNode {
  const data = useMemo(() => buildMarkers(props.directions), [props.directions]);

  if (data.features.length === 0) {
    return null;
  }

  return (
    <Source type="geojson" data={data}>
      <Layer {...circleStyle} />
      <Layer {...labelStyle} />
    </Source>
  );
}

const circleStyle: Omit<CircleLayerSpecification, "source"> = {
  id: "distance-marker-circle",
  type: "circle",
  paint: {
    "circle-radius": 10,
    "circle-color": "#ffffff",
    "circle-stroke-color": "#1f2937",
    "circle-stroke-width": 1.5,
    "circle-opacity": 0.95,
  },
};

const labelStyle: Omit<SymbolLayerSpecification, "source"> = {
  id: "distance-marker-label",
  type: "symbol",
  layout: {
    "text-field": ["to-string", ["get", "km"]],
    "text-size": 11,
    "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  },
  paint: {
    "text-color": "#1f2937",
  },
};
