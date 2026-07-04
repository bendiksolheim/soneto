import type { ReactNode } from "react";
import type { MarkerDragEvent, MarkerEvent } from "react-map-gl/mapbox";
import type { Point } from "@/lib/map/point";
import { RouteMarker } from "./route-marker";

type RouteProps = {
  route: Array<Point>;
  setRoute: (route: Array<Point>) => void;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onDeletePoint: (index: number) => void;
};

export function Markers(props: RouteProps): ReactNode {
  const handleMarkerClick = (indexToRemove: number, e: MarkerEvent<MouseEvent>) => {
    // Prevent the map's onClick from firing
    e.originalEvent?.stopPropagation();
    props.onDeletePoint(indexToRemove);
  };

  const handleMarkerDrag = (index: number, event: MarkerDragEvent) => {
    const { lng, lat } = event.lngLat;
    const newRoutePoints = [...props.route];
    newRoutePoints[index] = { latitude: lat, longitude: lng };
    props.setRoute(newRoutePoints);
  };

  return props.route.map((point, index) => (
    // A point's identity in the route is its index (delete/hover/drag all key off index),
    // and two points can legitimately share coordinates (e.g. a loop returning to its
    // start), so a coordinate-based key would collide. The index is the correct key here.
    <RouteMarker
      // biome-ignore lint/suspicious/noArrayIndexKey: index is the route point's identity (coords aren't unique for loops)
      key={index}
      index={index}
      point={point}
      numberOfPoints={props.route.length}
      isHovered={props.hoveredIndex === index}
      onClick={(e) => handleMarkerClick(index, e)}
      onDrag={(e) => handleMarkerDrag(index, e)}
      onMouseEnter={() => props.onHover(index)}
      onMouseLeave={() => props.onHover(null)}
    />
  ));
}
