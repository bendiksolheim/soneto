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

  return withMarkerKeys(props.route).map(({ point, index, key }) => (
    <RouteMarker
      key={key}
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

// Key each marker by its coordinates so a marker keeps its identity when points before
// it are removed. A route can visit the same spot more than once (e.g. a loop that ends
// where it starts), so repeated coordinates get an occurrence suffix.
function withMarkerKeys(route: Array<Point>): Array<{ point: Point; index: number; key: string }> {
  const coordinateKey = (point: Point) => `${point.latitude},${point.longitude}`;
  return route.map((point, index) => {
    const occurrence = route
      .slice(0, index)
      .filter((earlier) => coordinateKey(earlier) === coordinateKey(point)).length;
    return { point, index, key: `${coordinateKey(point)}#${occurrence}` };
  });
}
