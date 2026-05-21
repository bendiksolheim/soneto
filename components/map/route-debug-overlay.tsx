import type { ReactNode } from "react";
import { Layer, type LineLayerSpecification, type FillLayerSpecification, Source } from "react-map-gl/mapbox";
import type { RouteDebugData } from "@/lib/routes";

type RouteDebugOverlayProps = {
  data: RouteDebugData;
};

export function RouteDebugOverlay({ data }: RouteDebugOverlayProps): ReactNode {
  const { start, pFar, pLatL, pLatR, midpoints } = data.diamond;

  const toCoord = (p: { longitude: number; latitude: number }): [number, number] => [p.longitude, p.latitude];

  // Draw the waypoint path the algorithm sends to Mapbox as a closed LineString.
  // When midpoints are present (rounded topology) draw all 8 points; otherwise
  // draw the 4-point kite/triangle path.
  const coords: [number, number][] = midpoints
    ? [start, midpoints[0], pLatL, midpoints[1], pFar, midpoints[2], pLatR, midpoints[3], start].map(toCoord)
    : [start, pLatL, pFar, pLatR, start].map(toCoord);

  const waypointPath: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {},
  };

  return (
    <>
      <Source id="debug-diamond" type="geojson" data={waypointPath}>
        <Layer {...waypointPathHaloStyle} />
        <Layer {...waypointPathStyle} />
      </Source>

      {data.isochronePolygon && (
        <Source
          id="debug-isochrone"
          type="geojson"
          data={{
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [data.isochronePolygon] },
            properties: {},
          }}
        >
          <Layer {...isochroneFillStyle} />
          <Layer {...isochroneOutlineStyle} />
        </Source>
      )}
    </>
  );
}

const waypointPathHaloStyle: Omit<LineLayerSpecification, "source"> = {
  id: "debug-diamond-halo",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#ffffff",
    "line-width": 10,
    "line-opacity": 0.8,
  },
};

const waypointPathStyle: Omit<LineLayerSpecification, "source"> = {
  id: "debug-diamond-outline",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#ef4444",
    "line-width": 4,
    "line-opacity": 1,
    "line-dasharray": [5, 2],
  },
};

const isochroneFillStyle: Omit<FillLayerSpecification, "source"> = {
  id: "debug-isochrone-fill",
  type: "fill",
  paint: {
    "fill-color": "#f97316",
    "fill-opacity": 0.25,
  },
};

const isochroneOutlineStyle: Omit<LineLayerSpecification, "source"> = {
  id: "debug-isochrone-outline",
  type: "line",
  paint: {
    "line-color": "#f97316",
    "line-width": 3,
    "line-opacity": 1,
  },
};
