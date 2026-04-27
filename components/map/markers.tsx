import type { ReactNode } from "react";
import type { MarkerDragEvent, MarkerEvent } from "react-map-gl/mapbox";
import type { Point } from "@/lib/map/point";
import { RouteMarker } from "./route-marker";

type RouteProps = {
  route: Array<Point>;
  setRoute: (route: Array<Point>) => void;
};

export function Markers(props: RouteProps): ReactNode {
  const handleMarkerClick = (indexToRemove: number, e: MarkerEvent<MouseEvent>) => {
    // Prevent the map's onClick from firing
    e.originalEvent?.stopPropagation();

    // Remove the point at the specified index
    const newRoutePoints = props.route.filter((_, index) => index !== indexToRemove);
    props.setRoute(newRoutePoints);
  };

  const handleMarkerDrag = (index: number, event: MarkerDragEvent) => {
    const { lng, lat } = event.lngLat;
    const newRoutePoints = [...props.route];
    newRoutePoints[index] = { latitude: lat, longitude: lng };
    props.setRoute(newRoutePoints);
  };

  return props.route.map((point, index) => (
    <RouteMarker
      key={`${point.latitude}-${point.longitude}`}
      index={index}
      point={point}
      numberOfPoints={props.route.length}
      onClick={(e) => handleMarkerClick(index, e)}
      onDrag={(e) => handleMarkerDrag(index, e)}
    />
  ));
}
